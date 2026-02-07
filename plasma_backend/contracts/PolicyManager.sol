// contracts/PolicyManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IInsurancePool {
    function available(address token) external view returns (uint256);
    function payClaim(address token, address to, uint256 amount, uint256 policyId) external;
}

/// @notice ERC-721 policies + deterministic parametric payouts funded by InsurancePool.
/// Status codes (shared across system):
/// 0=Unknown, 1=OnTime, 2=Delayed, 3=Cancelled
contract PolicyManager is ERC721, Ownable, ReentrancyGuard {
    // Outcome status codes
    uint8 internal constant STATUS_ON_TIME = 1;
    uint8 internal constant STATUS_DELAYED = 2;
    uint8 internal constant STATUS_CANCELLED = 3;

    // Payout thresholds
    uint32 public constant DELAY_L1_MINS = 120; // >= 120 min => 25%
    uint32 public constant DELAY_L2_MINS = 240; // >= 240 min => 50%
    uint16 public constant BPS_25 = 2500;
    uint16 public constant BPS_50 = 5000;
    uint16 public constant BPS_100 = 10000;

    struct Policy {
        uint256 orderId;
        address token;
        uint256 ticketPrice;
        uint256 premium;
        uint40 expiryTs;   // for UX; not enforced as a hard stop
        bool settled;
        uint256 payout;
    }

    address public escrow;
    address public oracle;
    IInsurancePool public pool;

    uint256 public nextPolicyId = 1;
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => uint256) public policyIdByOrder;

    string private _baseTokenURI;

    event EscrowSet(address indexed escrow);
    event OracleSet(address indexed oracle);
    event PoolSet(address indexed pool);

    event PolicyMinted(uint256 indexed policyId, uint256 indexed orderId, address indexed holder);
    event PolicySettled(uint256 indexed policyId, uint8 status, uint32 delayMins, uint256 payout);

    modifier onlyEscrow() {
        require(msg.sender == escrow, "POLICY:NOT_ESCROW");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "POLICY:NOT_ORACLE");
        _;
    }

    constructor(address _pool) ERC721("Flight Policy", "FPOL") Ownable(msg.sender) {
        require(_pool != address(0), "POLICY:ZERO_POOL");
        pool = IInsurancePool(_pool);
        emit PoolSet(_pool);
    }

    function setEscrow(address _escrow) external onlyOwner {
        require(_escrow != address(0), "POLICY:ZERO_ESCROW");
        escrow = _escrow;
        emit EscrowSet(_escrow);
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "POLICY:ZERO_ORACLE");
        oracle = _oracle;
        emit OracleSet(_oracle);
    }

    function setPool(address _pool) external onlyOwner {
        require(_pool != address(0), "POLICY:ZERO_POOL");
        pool = IInsurancePool(_pool);
        emit PoolSet(_pool);
    }

    function setBaseURI(string calldata base_) external onlyOwner {
        _baseTokenURI = base_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @notice Mint policy for an order (called by TicketEscrow after taking premium).
    function mintPolicyFromEscrow(
        uint256 orderId,
        address holder,
        address token,
        uint256 ticketPrice,
        uint256 premium,
        uint40 expiryTs
    )
        external
        onlyEscrow
        nonReentrant
        returns (uint256 policyId)
    {
        require(holder != address(0), "POLICY:ZERO_HOLDER");
        require(token != address(0), "POLICY:ZERO_TOKEN");
        require(ticketPrice > 0, "POLICY:ZERO_TICKET");
        require(premium > 0, "POLICY:ZERO_PREMIUM");
        require(policyIdByOrder[orderId] == 0, "POLICY:ALREADY_EXISTS");

        policyId = nextPolicyId++;
        _safeMint(holder, policyId);

        policies[policyId] = Policy({
            orderId: orderId,
            token: token,
            ticketPrice: ticketPrice,
            premium: premium,
            expiryTs: expiryTs,
            settled: false,
            payout: 0
        });

        policyIdByOrder[orderId] = policyId;

        emit PolicyMinted(policyId, orderId, holder);
    }

    function settlePolicy(uint256 policyId, uint8 status, uint32 delayMins)
        external
        onlyOracle
        nonReentrant
    {
        _settle(policyId, status, delayMins);
    }

    /// @notice Oracle convenience: settle by orderId. If no policy exists, it no-ops.
    function settlePolicyByOrder(uint256 orderId, uint8 status, uint32 delayMins)
        external
        onlyOracle
        nonReentrant
    {
        uint256 policyId = policyIdByOrder[orderId];
        if (policyId == 0) return;
        _settle(policyId, status, delayMins);
    }

    function _settle(uint256 policyId, uint8 status, uint32 delayMins) internal {
        Policy storage p = policies[policyId];
        require(p.orderId != 0, "POLICY:NOT_FOUND");
        require(!p.settled, "POLICY:ALREADY_SETTLED");

        uint256 payout = 0;

        if (status == STATUS_CANCELLED) {
            payout = (p.ticketPrice * BPS_100) / 10000;
        } else if (status == STATUS_DELAYED) {
            if (delayMins >= DELAY_L2_MINS) {
                payout = (p.ticketPrice * BPS_50) / 10000;
            } else if (delayMins >= DELAY_L1_MINS) {
                payout = (p.ticketPrice * BPS_25) / 10000;
            }
        } // OnTime/Unknown => 0

        p.settled = true;
        p.payout = payout;

        if (payout > 0) {
            // Pay current NFT holder
            address to = ownerOf(policyId);
            require(pool.available(p.token) >= payout, "POLICY:POOL_INSUFFICIENT");
            pool.payClaim(p.token, to, payout, policyId);
        }

        emit PolicySettled(policyId, status, delayMins, payout);
    }
}
