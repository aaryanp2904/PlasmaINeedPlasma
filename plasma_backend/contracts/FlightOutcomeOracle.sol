// contracts/FlightOutcomeOracle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface ITicketEscrowOracle {
    function settleOrder(uint256 orderId, uint8 outcomeStatus, uint32 delayMins) external;
    function getOrderParams(uint256 orderId) external view returns (uint40 arrivalTs, bool refundOnCancel, uint256 policyId, uint8 status);
}

interface IPolicyManagerOracle {
    function settlePolicyByOrder(uint256 orderId, uint8 status, uint32 delayMins) external;
}

/// @notice k-of-n committee oracle with EIP-712 signatures. Anyone can submit, but must include valid sigs.
contract FlightOutcomeOracle is Ownable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    // Outcome status codes
    uint8 internal constant STATUS_ON_TIME = 1;
    uint8 internal constant STATUS_DELAYED = 2;
    uint8 internal constant STATUS_CANCELLED = 3;

    bytes32 private constant OUTCOME_TYPEHASH =
        keccak256("Outcome(uint256 orderId,uint8 status,uint32 delayMins,uint40 reportedAt)");

    ITicketEscrowOracle public escrow;
    IPolicyManagerOracle public policyManager;

    uint256 public threshold;        // k
    uint256 public signerCount;      // n (<=256)

    mapping(address => bool) public isSigner;
    mapping(address => uint8) public signerIndex; // 0..n-1

    mapping(uint256 => bool) public finalized;

    event OutcomeFinalized(uint256 indexed orderId, uint8 status, uint32 delayMins, uint40 reportedAt);
    event PolicySettlementFailed(uint256 indexed orderId, bytes reason);

    constructor(
        address _escrow,
        address _policyManager,
        uint256 _threshold,
        address[] memory signers
    )
        Ownable(msg.sender)
        EIP712("FlightOutcomeOracle", "1")
    {
        require(_escrow != address(0), "ORACLE:ZERO_ESCROW");
        require(_policyManager != address(0), "ORACLE:ZERO_PM");
        require(signers.length > 0 && signers.length <= 256, "ORACLE:BAD_SIGNERS_LEN");
        require(_threshold > 0 && _threshold <= signers.length, "ORACLE:BAD_THRESHOLD");

        escrow = ITicketEscrowOracle(_escrow);
        policyManager = IPolicyManagerOracle(_policyManager);
        threshold = _threshold;
        signerCount = signers.length;

        for (uint256 i = 0; i < signers.length; i++) {
            address s = signers[i];
            require(s != address(0), "ORACLE:ZERO_SIGNER");
            require(!isSigner[s], "ORACLE:DUP_SIGNER");
            isSigner[s] = true;
            signerIndex[s] = uint8(i);
        }
    }

    function setThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold > 0 && _threshold <= signerCount, "ORACLE:BAD_THRESHOLD");
        threshold = _threshold;
    }

    /// @notice Finalize an outcome with k-of-n valid committee signatures.
    /// @param reportedAt timestamp included in the signed message (prevents stale-sign confusion; domain prevents cross-chain replay).
    function finalizeOutcome(
        uint256 orderId,
        uint8 status,
        uint32 delayMins,
        uint40 reportedAt,
        bytes[] calldata sigs
    )
        external
        nonReentrant
    {
        require(!finalized[orderId], "ORACLE:ALREADY_FINAL");
        require(status == STATUS_ON_TIME || status == STATUS_DELAYED || status == STATUS_CANCELLED, "ORACLE:BAD_STATUS");
        if (status != STATUS_DELAYED) delayMins = 0;
        require(sigs.length >= threshold, "ORACLE:NOT_ENOUGH_SIGS");

        bytes32 structHash = keccak256(abi.encode(
            OUTCOME_TYPEHASH,
            orderId,
            status,
            delayMins,
            reportedAt
        ));
        bytes32 digest = _hashTypedDataV4(structHash);

        // verify k distinct signers using a bitmap (requires n<=256)
        uint256 seen = 0;
        uint256 valid = 0;

        for (uint256 i = 0; i < sigs.length && valid < threshold; i++) {
            address recovered = digest.recover(sigs[i]);
            if (!isSigner[recovered]) continue;

            uint256 bit = 1 << signerIndex[recovered];
            if (seen & bit != 0) continue;

            seen |= bit;
            valid++;
        }

        require(valid >= threshold, "ORACLE:BAD_SIGS");

        finalized[orderId] = true;
        emit OutcomeFinalized(orderId, status, delayMins, reportedAt);

        // If the order is configured to refund on cancel, suppress cancellation insurance payout to avoid double-payment.
        (, bool refundOnCancel,,) = escrow.getOrderParams(orderId);
        uint8 policyStatus = status;
        uint32 policyDelay = delayMins;

        if (refundOnCancel && status == STATUS_CANCELLED) {
            policyStatus = STATUS_ON_TIME;
            policyDelay = 0;
        }

        // Don't block escrow settlement if pool is short etc.
        try policyManager.settlePolicyByOrder(orderId, policyStatus, policyDelay) {
            // ok
        } catch (bytes memory reason) {
            emit PolicySettlementFailed(orderId, reason);
        }

        // This moves the ticketPrice (merchant release or buyer refund)
        escrow.settleOrder(orderId, status, delayMins);
    }
}
