// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/MultiTokenFaucet.sol";


// Simple mock ERC20 with configurable decimals, for testing different token decimals (6 vs 18)
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_)
        ERC20(name, symbol)
    {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}


contract MultiTokenFaucetTest is Test {
    MultiTokenFaucet public faucet;

    MockERC20 public usdc; // 6 decimals
    MockERC20 public dai;  // 18 decimals
    MockERC20 public link; // 18 decimals
    MockERC20 public weth; // 18 decimals
    MockERC20 public flux; // 18 decimals

    address public owner = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    uint256 constant CLAIM_USDC = 500 * 10 ** 6;
    uint256 constant CLAIM_18DEC = 500 * 10 ** 18;

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        dai = new MockERC20("Mock DAI", "DAI", 18);
        link = new MockERC20("Mock LINK", "LINK", 18);
        weth = new MockERC20("Mock WETH", "WETH", 18);
        flux = new MockERC20("Mock FLUX", "FLUX", 18);

        address[] memory tokens = new address[](5);
        tokens[0] = address(usdc);
        tokens[1] = address(dai);
        tokens[2] = address(link);
        tokens[3] = address(weth);
        tokens[4] = address(flux);

        uint256[] memory amounts = new uint256[](5);
        amounts[0] = CLAIM_USDC;
        amounts[1] = CLAIM_18DEC;
        amounts[2] = CLAIM_18DEC;
        amounts[3] = CLAIM_18DEC;
        amounts[4] = CLAIM_18DEC;

        faucet = new MultiTokenFaucet(tokens, amounts);

        // Fund the faucet with enough for many claims
        usdc.mint(address(faucet), CLAIM_USDC * 1000);
        dai.mint(address(faucet), CLAIM_18DEC * 1000);
        link.mint(address(faucet), CLAIM_18DEC * 1000);
        weth.mint(address(faucet), CLAIM_18DEC * 1000);
        flux.mint(address(faucet), CLAIM_18DEC * 1000);
    }

    // --- Basic claim tests ---

    function test_ClaimTransfersAllFiveTokens() public {
        vm.prank(alice);
        faucet.claim();

        assertEq(usdc.balanceOf(alice), CLAIM_USDC);
        assertEq(dai.balanceOf(alice), CLAIM_18DEC);
        assertEq(link.balanceOf(alice), CLAIM_18DEC);
        assertEq(weth.balanceOf(alice), CLAIM_18DEC);
        assertEq(flux.balanceOf(alice), CLAIM_18DEC);
    }

    function test_ClaimUpdatesLastClaimTimestamp() public {
        vm.prank(alice);
        faucet.claim();

        assertEq(faucet.lastClaim(alice), block.timestamp);
    }

    function test_ClaimEmitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit MultiTokenFaucet.Claimed(alice, block.timestamp);

        vm.prank(alice);
        faucet.claim();
    }

    // --- Cooldown tests ---

    function test_RevertWhen_ClaimingBeforeCooldownExpires() public {
        vm.prank(alice);
        faucet.claim();

        // Try to claim again immediately
        vm.prank(alice);
        vm.expectRevert("Cooldown active");
        faucet.claim();
    }

    function test_CanClaimAfterDefaultCooldown() public {
        vm.prank(alice);
        faucet.claim();

        // Default cooldown is 24 hours
        vm.warp(block.timestamp + 24 hours);

        vm.prank(alice);
        faucet.claim();

        assertEq(usdc.balanceOf(alice), CLAIM_USDC * 2);
    }

    function test_RevertWhen_ClaimingOneSecondBeforeCooldownEnds() public {
        vm.prank(alice);
        faucet.claim();

        // vm.warp(block.timestamp + 24 hours - 1);
        vm.warp(block.timestamp + 3 minutes - 1);


        vm.prank(alice);
        vm.expectRevert("Cooldown active");
        faucet.claim();
    }

    function test_DifferentUsersHaveIndependentCooldowns() public {
        vm.prank(alice);
        faucet.claim();

        // Bob can claim immediately even though Alice just claimed
        vm.prank(bob);
        faucet.claim();

        assertEq(usdc.balanceOf(alice), CLAIM_USDC);
        assertEq(usdc.balanceOf(bob), CLAIM_USDC);
    }

    // --- setCooldown tests ---

    function test_OwnerCanSetCooldownTo2Hours() public {
        faucet.setCooldown(2 hours);
        assertEq(faucet.cooldown(), 2 hours);

        vm.prank(alice);
        faucet.claim();

        // Cannot claim before 2 hours
        vm.warp(block.timestamp + 2 hours - 1);
        vm.prank(alice);
        vm.expectRevert("Cooldown active");
        faucet.claim();

        // Can claim after 2 hours
        vm.warp(block.timestamp + 1);
        vm.prank(alice);
        faucet.claim();

        assertEq(usdc.balanceOf(alice), CLAIM_USDC * 2);
    }

    function test_RevertWhen_NonOwnerSetsCooldown() public {
        vm.prank(alice);
        vm.expectRevert();
        faucet.setCooldown(2 hours);
    }

    function test_SetCooldownEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit MultiTokenFaucet.CooldownUpdated(2 hours);
        faucet.setCooldown(2 hours);
    }

    function test_ChangingCooldownAffectsExistingUsersImmediately() public {
        // Alice claims under 24h cooldown
        vm.prank(alice);
        faucet.claim();

        // Owner shortens cooldown to 2 hours
        faucet.setCooldown(2 hours);

        // Alice still can't claim immediately
        vm.prank(alice);
        vm.expectRevert("Cooldown active");
        faucet.claim();

        // But can after 2 hours (not the original 24h)
        vm.warp(block.timestamp + 2 hours);
        vm.prank(alice);
        faucet.claim();

        assertEq(usdc.balanceOf(alice), CLAIM_USDC * 2);
    }

    // --- timeUntilNextClaim tests ---

    function test_TimeUntilNextClaimReturnsZeroForNewUser() public view {
        assertEq(faucet.timeUntilNextClaim(alice), 0);
    }

    function test_TimeUntilNextClaimReturnsCorrectRemaining() public {
        vm.prank(alice);
        faucet.claim();

        assertEq(faucet.timeUntilNextClaim(alice), faucet.cooldown());

        vm.warp(block.timestamp + 1 minutes);
        assertEq(faucet.timeUntilNextClaim(alice), faucet.cooldown() - 1 minutes);
    }

    function test_TimeUntilNextClaimReturnsZeroAfterCooldownPasses() public {
        vm.prank(alice);
        faucet.claim();

        vm.warp(block.timestamp + faucet.cooldown());
        assertEq(faucet.timeUntilNextClaim(alice), 0);
    }

    // --- setTokenAmount tests ---

    function test_OwnerCanUpdateTokenAmount() public {
        faucet.setTokenAmount(address(usdc), 1000 * 10 ** 6);

        vm.prank(alice);
        faucet.claim();

        assertEq(usdc.balanceOf(alice), 1000 * 10 ** 6);
    }

    function test_OwnerCanAddNewToken() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW", 18);
        newToken.mint(address(faucet), CLAIM_18DEC * 100);

        faucet.setTokenAmount(address(newToken), CLAIM_18DEC);

        address[] memory allTokens = faucet.getTokens();
        assertEq(allTokens.length, 6);

        vm.prank(alice);
        faucet.claim();

        assertEq(newToken.balanceOf(alice), CLAIM_18DEC);
    }

    function test_RevertWhen_NonOwnerSetsTokenAmount() public {
        vm.prank(alice);
        vm.expectRevert();
        faucet.setTokenAmount(address(usdc), 1000 * 10 ** 6);
    }

    function test_SettingTokenAmountToZeroSkipsTransfer() public {
        faucet.setTokenAmount(address(usdc), 0);

        vm.prank(alice);
        faucet.claim();

        assertEq(usdc.balanceOf(alice), 0);
        assertEq(dai.balanceOf(alice), CLAIM_18DEC); // other tokens still sent
    }

    // --- Insufficient balance handling ---

    function test_ClaimSkipsTokenIfFaucetBalanceInsufficient() public {
        // Drain USDC from faucet to below the claim amount
        vm.prank(owner);
        faucet.withdrawToken(address(usdc), usdc.balanceOf(address(faucet)), owner);

        vm.prank(alice);
        faucet.claim(); // should not revert; just skips USDC

        assertEq(usdc.balanceOf(alice), 0);
        assertEq(dai.balanceOf(alice), CLAIM_18DEC); // other tokens still received
    }

    // --- withdrawToken tests ---

    function test_OwnerCanWithdrawTokens() public {
        uint256 faucetBalanceBefore = usdc.balanceOf(address(faucet));

        faucet.withdrawToken(address(usdc), faucetBalanceBefore, owner);

        assertEq(usdc.balanceOf(owner), faucetBalanceBefore);
        assertEq(usdc.balanceOf(address(faucet)), 0);
    }

    function test_RevertWhen_NonOwnerWithdraws() public {
        vm.prank(alice);
        vm.expectRevert();
        faucet.withdrawToken(address(usdc), 100, alice);
    }

    // --- getTokens test ---

    function test_GetTokensReturnsAllConfiguredTokens() public view {
        address[] memory allTokens = faucet.getTokens();
        assertEq(allTokens.length, 5);
        assertEq(allTokens[0], address(usdc));
        assertEq(allTokens[4], address(flux));
    }

    // --- Fuzz test ---

    function testFuzz_CooldownEnforcedForAnyDuration(uint256 newCooldown, uint256 warpAmount) public {
        newCooldown = bound(newCooldown, 1, 365 days);
        warpAmount = bound(warpAmount, 0, 365 days);

        faucet.setCooldown(newCooldown);

        vm.prank(alice);
        faucet.claim();

        vm.warp(block.timestamp + warpAmount);

        vm.prank(alice);
        if (warpAmount < newCooldown) {
            vm.expectRevert("Cooldown active");
            faucet.claim();
        } else {
            faucet.claim();
            assertEq(usdc.balanceOf(alice), CLAIM_USDC * 2);
        }
    }
}