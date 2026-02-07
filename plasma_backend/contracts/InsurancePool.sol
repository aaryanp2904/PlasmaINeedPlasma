// contracts/InsurancePool.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Holds premiums + liquidity, pays claims (only callable by PolicyManager).
contract InsurancePool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public policyManager;

    event PolicyManagerSet(address indexed policyManager);
    event PoolFunded(address indexed funder, address indexed token, uint256 amount);
    event ClaimPaid(address indexed token, address indexed to, uint256 amount, uint256 indexed policyId);

    modifier onlyPolicyManager() {
        require(msg.sender == policyManager, "POOL:NOT_POLICY_MANAGER");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setPolicyManager(address _pm) external onlyOwner {
        require(_pm != address(0), "POOL:ZERO_PM");
        policyManager = _pm;
        emit PolicyManagerSet(_pm);
    }

    function fundPool(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "POOL:ZERO_TOKEN");
        require(amount > 0, "POOL:ZERO_AMOUNT");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit PoolFunded(msg.sender, token, amount);
    }

    function available(address token) public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function payClaim(address token, address to, uint256 amount, uint256 policyId)
        external
        nonReentrant
        onlyPolicyManager
    {
        if (amount == 0) return;
        IERC20(token).safeTransfer(to, amount);
        emit ClaimPaid(token, to, amount, policyId);
    }
}
