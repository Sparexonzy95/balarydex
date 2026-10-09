// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/MockERC20.sol";

contract MockERC20Test is Test {
    MockERC20 public token;
    address public deployer = address(this);
    address public recipient = address(0x111);
    address public minter = address(0x222);
    address public user = address(0x333);

    function setUp() public {
        token = new MockERC20("Balary", "BAL", 18, 1_000_000 * 10**18, recipient);
    }

    function test_InitialSupplyMintedToRecipient() public {
        assertEq(token.balanceOf(recipient), 1_000_000 * 10**18);
        assertEq(token.totalSupply(), 1_000_000 * 10**18);
        assertEq(token.owner(), recipient);
    }

    function test_OwnerCanMintAdditionalTokens() public {
        vm.prank(recipient);
        token.mint(user, 500 * 10**18);

        assertEq(token.balanceOf(user), 500 * 10**18);
        assertEq(token.totalSupply(), 1_000_500 * 10**18);
    }

    function test_AuthorizedMinterCanMint() public {
        vm.prank(recipient);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user, 100 * 10**18);

        assertEq(token.balanceOf(user), 100 * 10**18);
    }

    function test_UnauthorizedUserCannotMint() public {
        vm.prank(user);
        vm.expectRevert("Not authorized to mint");
        token.mint(user, 100 * 10**18);
    }

    function test_CannotExceedMaxSupply() public {
        uint256 remaining = token.maxSupply() - token.totalSupply();
        
        vm.prank(recipient);
        vm.expectRevert("Exceeds max supply");
        token.mint(recipient, remaining + 1);
    }
}
