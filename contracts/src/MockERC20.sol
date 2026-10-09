// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;
    uint256 public immutable maxSupply;
    mapping(address => bool) public minters;

    event MinterUpdated(address indexed minter, bool enabled);

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 amount,
        address _to
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
        maxSupply = 10_000_000_000 * (10 ** decimals_);
        require(amount <= maxSupply, "Amount exceeds max supply");
        if (amount > 0) {
            _mint(_to, amount);
        }
        if (_to != msg.sender && _to != address(0)) {
            _transferOwnership(_to);
        }
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setMinter(address minter, bool enabled) external onlyOwner {
        minters[minter] = enabled;
        emit MinterUpdated(minter, enabled);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner() || minters[msg.sender], "Not authorized to mint");
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply");
        _mint(to, amount);
    }
}