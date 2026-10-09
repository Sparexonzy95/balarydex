// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {console} from "forge-std/console.sol";

import {PointsHook} from "../src/PointsHook.sol";

contract PointsHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    PointsHook hook;
    PoolId poolId;

    address alice = makeAddr("alice");

    function setUp() public {
        // 1. Deploy PoolManager + routers (PoolSwapTest, PoolModifyLiquidityTest) and two test currencies
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();

        // 2. Mine a salt so the hook address encodes the correct permission flags
        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG);

        (address hookAddress, bytes32 salt) = HookMiner.find(
            address(this),
            flags,
            type(PointsHook).creationCode,
            abi.encode(manager)
        );

        // 3. Deploy the hook to the mined address via CREATE2
        hook = new PointsHook{salt: salt}(manager);
        require(address(hook) == hookAddress, "hook address mismatch");

        // 4. Give the hook allowance to pull tokens from this test contract if needed
        //    (not required for this hook since it doesn't take payments, but harmless)
        MockERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
        MockERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);

        // 5. Create the pool
        (key, poolId) = initPool(
            currency0,
            currency1,
            hook,
            3000, // fee
            SQRT_PRICE_1_1
        );

        // 6. Seed liquidity so swaps have something to trade against
        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 100 ether,
                salt: bytes32(0)
            }),
            ""
        );
    }

    function test_hookPermissions_onlyAfterSwap() public view {
        Hooks.Permissions memory perms = hook.getHookPermissions();
        assertFalse(perms.beforeSwap);
        assertTrue(perms.afterSwap);
        assertFalse(perms.beforeAddLiquidity);
    }

    function test_swap_mintsPoints_whenHookDataProvided() public {
        bytes memory hookData = abi.encode(alice);

        uint256 tokenId = uint256(PoolId.unwrap(poolId));
        assertEq(hook.balanceOf(alice, tokenId), 0);


        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether, // exact input, 1 token0 -> token1
            sqrtPriceLimitX96: MIN_PRICE_LIMIT
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        swapRouter.swap(key, params, settings, hookData);

        uint256 pointsMinted = hook.balanceOf(alice, tokenId);

        assertGt(pointsMinted, 0, "expected points to be minted to alice");

        // sanity check: roughly amount/100 magnitude, not an exact oracle price match
        assertApproxEqAbs(pointsMinted, 1 ether / 100, 0.01 ether);
    }

    function test_swap_noPoints_whenHookDataEmpty() public {
        uint256 tokenId = uint256(PoolId.unwrap(poolId));

        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: MIN_PRICE_LIMIT
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        swapRouter.swap(key, params, settings, "");

        assertEq(hook.balanceOf(alice, tokenId), 0, "no points should be minted without hookData");
    }

    function test_swap_noPoints_whenUserIsZeroAddress() public {
        bytes memory hookData = abi.encode(address(0));
        uint256 tokenId = uint256(PoolId.unwrap(poolId));

        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: MIN_PRICE_LIMIT
        });

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        swapRouter.swap(key, params, settings, hookData);

        assertEq(hook.balanceOf(address(0), tokenId), 0);
    }

    function test_points_areIsolated_perPool() public {
        // sanity check that tokenId is genuinely derived from poolId, not a constant
        uint256 tokenId = uint256(PoolId.unwrap(poolId));
        assertEq(tokenId, uint256(PoolId.unwrap(key.toId())));
    }
}