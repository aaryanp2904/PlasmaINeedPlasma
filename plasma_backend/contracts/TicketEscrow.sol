// contracts/TicketEscrow.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPolicyManagerMint {
    function mintPolicyFromEscrow(
        uint256 orderId,
        address holder,
        address token,
        uint256 ticketPrice,
        uint256 premium,
        uint40 expiryTs
    ) external returns (uint256 policyId);
}

/// @notice Holds ticket funds in escrow, optionally mints insurance policy and forwards premium to pool.
contract TicketEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Status codes
    uint8 internal constant ORDER_CREATED = 1;
    uint8 internal constant ORDER_POLICY_LINKED = 2;
    uint8 internal constant ORDER_RELEASED = 3;
    uint8 internal constant ORDER_REFUNDED = 4;

    // Outcome status codes
    uint8 internal constant STATUS_ON_TIME = 1;
    uint8 internal constant STATUS_DELAYED = 2;
    uint8 internal constant STATUS_CANCELLED = 3;

    struct Order {
        address buyer;
        address merchant;
        address token;
        uint256 ticketPrice;
        uint256 premium;          // premium paid (0 if none)
        bytes32 flightIdHash;
        uint40 departTs;
        uint40 arrivalTs;
        bool refundOnCancel;      // if true: Cancelled => refund ticketPrice (and oracle suppresses cancel payout)
        uint256 policyId;         // 0 if none
        uint8 status;             // ORDER_*
        uint8 outcomeStatus;      // STATUS_* (set at settlement)
        uint32 outcomeDelayMins;  // set at settlement
        uint40 createdAt;
        uint40 settledAt;
    }

    uint256 public nextOrderId = 1;

    address public policyManager;
    address public insurancePool;
    address public oracle;

    uint40 public settlementBuffer = 30 minutes;

    mapping(uint256 => Order) public orders;

    event AddressesSet(address indexed policyManager, address indexed insurancePool, address indexed oracle);
    event SettlementBufferSet(uint40 bufferSeconds);

    event OrderCreated(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed merchant,
        address token,
        uint256 ticketPrice,
        uint256 premium,
        bytes32 flightIdHash
    );

    event PolicyLinked(uint256 indexed orderId, uint256 indexed policyId);
    event OrderSettled(uint256 indexed orderId, uint8 outcomeStatus, uint32 delayMins);
    event FundsReleased(uint256 indexed orderId, address indexed merchant, uint256 amount);
    event FundsRefunded(uint256 indexed orderId, address indexed buyer, uint256 amount);

    modifier onlyOracle() {
        require(msg.sender == oracle, "ESCROW:NOT_ORACLE");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setAddresses(address _policyManager, address _insurancePool, address _oracle) external onlyOwner {
        require(_policyManager != address(0), "ESCROW:ZERO_PM");
        require(_insurancePool != address(0), "ESCROW:ZERO_POOL");
        require(_oracle != address(0), "ESCROW:ZERO_ORACLE");
        policyManager = _policyManager;
        insurancePool = _insurancePool;
        oracle = _oracle;
        emit AddressesSet(_policyManager, _insurancePool, _oracle);
    }

    function setSettlementBuffer(uint40 bufferSeconds) external onlyOwner {
        settlementBuffer = bufferSeconds;
        emit SettlementBufferSet(bufferSeconds);
    }

    /// @notice Create an order. If premium>0, mints a policy in the same tx and forwards premium to pool.
    /// @dev If refundOnCancel=true, the oracle will suppress cancellation insurance payout to avoid double-payment.
    function createOrder(
        address merchant,
        address token,
        uint256 ticketPrice,
        uint256 premium,
        bytes32 flightIdHash,
        uint40 departTs,
        uint40 arrivalTs,
        bool refundOnCancel
    )
        external
        nonReentrant
        returns (uint256 orderId, uint256 policyId)
    {
        require(merchant != address(0), "ESCROW:ZERO_MERCHANT");
        require(token != address(0), "ESCROW:ZERO_TOKEN");
        require(ticketPrice > 0, "ESCROW:ZERO_TICKET");
        require(arrivalTs > departTs, "ESCROW:BAD_TS");

        orderId = nextOrderId++;

        // Pull funds from buyer: ticket + optional premium
        uint256 total = ticketPrice + premium;
        IERC20(token).safeTransferFrom(msg.sender, address(this), total);

        Order storage o = orders[orderId];
        o.buyer = msg.sender;
        o.merchant = merchant;
        o.token = token;
        o.ticketPrice = ticketPrice;
        o.premium = premium;
        o.flightIdHash = flightIdHash;
        o.departTs = departTs;
        o.arrivalTs = arrivalTs;
        o.refundOnCancel = refundOnCancel;
        o.createdAt = uint40(block.timestamp);

        // Ticket funds stay in escrow. Premium (if any) is forwarded to pool + policy minted.
        if (premium > 0) {
            require(policyManager != address(0) && insurancePool != address(0), "ESCROW:ADDR_NOT_SET");

            IERC20(token).safeTransfer(insurancePool, premium);

            uint40 expiryTs = arrivalTs + 7 days; // simple default for demo UX
            policyId = IPolicyManagerMint(policyManager).mintPolicyFromEscrow(
                orderId, msg.sender, token, ticketPrice, premium, expiryTs
            );

            o.policyId = policyId;
            o.status = ORDER_POLICY_LINKED;
            emit PolicyLinked(orderId, policyId);
        } else {
            o.status = ORDER_CREATED;
        }

        emit OrderCreated(orderId, msg.sender, merchant, token, ticketPrice, premium, flightIdHash);
    }

    /// @notice Add insurance to an existing order (one more tx). Must be before departure.
    function buyInsurance(uint256 orderId, uint256 premium) external nonReentrant returns (uint256 policyId) {
        Order storage o = orders[orderId];
        require(o.buyer != address(0), "ESCROW:NOT_FOUND");
        require(msg.sender == o.buyer, "ESCROW:NOT_BUYER");
        require(o.policyId == 0, "ESCROW:ALREADY_INSURED");
        require(premium > 0, "ESCROW:ZERO_PREMIUM");
        require(block.timestamp < o.departTs, "ESCROW:PAST_DEPART");
        require(policyManager != address(0) && insurancePool != address(0), "ESCROW:ADDR_NOT_SET");

        IERC20(o.token).safeTransferFrom(msg.sender, address(this), premium);
        IERC20(o.token).safeTransfer(insurancePool, premium);

        uint40 expiryTs = o.arrivalTs + 7 days;
        policyId = IPolicyManagerMint(policyManager).mintPolicyFromEscrow(
            orderId, o.buyer, o.token, o.ticketPrice, premium, expiryTs
        );

        o.premium = premium;
        o.policyId = policyId;
        o.status = ORDER_POLICY_LINKED;

        emit PolicyLinked(orderId, policyId);
    }

    /// @notice Called by the oracle after outcome finalization. Releases ticket funds to merchant, or refunds on cancel if configured.
    function settleOrder(uint256 orderId, uint8 outcomeStatus, uint32 delayMins) external nonReentrant onlyOracle {
        Order storage o = orders[orderId];
        require(o.buyer != address(0), "ESCROW:NOT_FOUND");
        require(o.status == ORDER_CREATED || o.status == ORDER_POLICY_LINKED, "ESCROW:BAD_STATUS");

        // Basic time gate to stop instant settlement
        require(block.timestamp >= uint256(o.arrivalTs) + uint256(settlementBuffer), "ESCROW:TOO_EARLY");

        // Validate outcome inputs lightly
        require(outcomeStatus == STATUS_ON_TIME || outcomeStatus == STATUS_DELAYED || outcomeStatus == STATUS_CANCELLED, "ESCROW:BAD_OUTCOME");
        if (outcomeStatus != STATUS_DELAYED) {
            // Normalize delayMins for non-delay outcomes
            delayMins = 0;
        }

        o.outcomeStatus = outcomeStatus;
        o.outcomeDelayMins = delayMins;
        o.settledAt = uint40(block.timestamp);

        emit OrderSettled(orderId, outcomeStatus, delayMins);

        if (o.refundOnCancel && outcomeStatus == STATUS_CANCELLED) {
            o.status = ORDER_REFUNDED;
            IERC20(o.token).safeTransfer(o.buyer, o.ticketPrice);
            emit FundsRefunded(orderId, o.buyer, o.ticketPrice);
        } else {
            o.status = ORDER_RELEASED;
            IERC20(o.token).safeTransfer(o.merchant, o.ticketPrice);
            emit FundsReleased(orderId, o.merchant, o.ticketPrice);
        }
    }

    /// @notice Minimal view for the oracle/frontend.
    function getOrderParams(uint256 orderId)
        external
        view
        returns (uint40 arrivalTs, bool refundOnCancel, uint256 policyId, uint8 status)
    {
        Order storage o = orders[orderId];
        return (o.arrivalTs, o.refundOnCancel, o.policyId, o.status);
    }
}
