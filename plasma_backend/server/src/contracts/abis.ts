export const TicketEscrowAbi = [
  "function createOrder(address merchant,address token,uint256 ticketPrice,uint256 premium,bytes32 flightIdHash,uint40 departTs,uint40 arrivalTs,bool refundOnCancel) returns (uint256 orderId,uint256 policyId)",
  "function buyInsurance(uint256 orderId,uint256 premium) returns (uint256 policyId)",
  "function orders(uint256) view returns (address buyer,address merchant,address token,uint256 ticketPrice,uint256 premium,bytes32 flightIdHash,uint40 departTs,uint40 arrivalTs,bool refundOnCancel,uint256 policyId,uint8 status,uint8 outcomeStatus,uint32 outcomeDelayMins,uint40 createdAt,uint40 settledAt)",
  "event OrderCreated(uint256 indexed orderId,address indexed buyer,address indexed merchant,address token,uint256 ticketPrice,uint256 premium,bytes32 flightIdHash)"
];

export const PolicyManagerAbi = [
  "function policyIdByOrder(uint256) view returns (uint256)",
  "function policies(uint256) view returns (uint256 orderId,address token,uint256 ticketPrice,uint256 premium,uint40 expiryTs,bool settled,uint256 payout)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

export const InsurancePoolAbi = [
  "function available(address token) view returns (uint256)"
];

export const OracleAbi = [
  "function finalized(uint256 orderId) view returns (bool)",
  "function finalizeOutcome(uint256 orderId,uint8 status,uint32 delayMins,uint40 reportedAt,bytes[] sigs)"
];

export const ERC20Abi = [
  "function allowance(address owner,address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender,uint256 amount) returns (bool)"
];
