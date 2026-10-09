// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MultiTokenFaucet is Ownable {
    using SafeERC20 for IERC20;

    uint256 public cooldown = 24 hours;

    address[] public tokens;
    mapping(address => uint256) public amounts; // token => amount per claim
    mapping(address => uint256) public lastClaim; // user => timestamp

    event Claimed(address indexed user, uint256 timestamp);
    event CooldownUpdated(uint256 newCooldown);
    event TokenConfigured(address indexed token, uint256 amount);
    event TokenRemoved(address indexed token);

    constructor(address[] memory _tokens, uint256[] memory _amounts) Ownable(msg.sender) {
        require(_tokens.length == _amounts.length, "Length mismatch");
        for (uint256 i = 0; i < _tokens.length; i++) {
            tokens.push(_tokens[i]);
            amounts[_tokens[i]] = _amounts[i];
        }
    }

    function claim() external {
        require(
            lastClaim[msg.sender] == 0 || block.timestamp >= lastClaim[msg.sender] + cooldown,
            "Cooldown active"
        );

        lastClaim[msg.sender] = block.timestamp;

        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = amounts[token];
            if (amount > 0 && IERC20(token).balanceOf(address(this)) >= amount) {
                IERC20(token).safeTransfer(msg.sender, amount);
            }
        }

        emit Claimed(msg.sender, block.timestamp);
    }

    function timeUntilNextClaim(address user) external view returns (uint256) {
        if (lastClaim[user] == 0) return 0;
        uint256 nextClaimTime = lastClaim[user] + cooldown;
        if (block.timestamp >= nextClaimTime) return 0;
        return nextClaimTime - block.timestamp;
    }

    // --- Admin functions ---

    function setCooldown(uint256 _cooldownSeconds) external onlyOwner {
        cooldown = _cooldownSeconds;
        emit CooldownUpdated(_cooldownSeconds);
    }

    function setTokenAmount(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        bool exists = false;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == token) { exists = true; break; }
        }
        if (!exists) tokens.push(token);
        amounts[token] = amount;
        emit TokenConfigured(token, amount);
    }

    function removeToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        amounts[token] = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == token) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                emit TokenRemoved(token);
                break;
            }
        }
    }

    function withdrawToken(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }

    function getTokens() external view returns (address[] memory) {
        return tokens;
    }
}