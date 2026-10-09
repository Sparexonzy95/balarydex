// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";

contract PoolActionRunner is IUnlockCallback {
    IPoolManager public immutable manager;
    address public immutable owner;

    enum Action { SEED_LIQUIDITY, EXECUTE_SWAPS }

    constructor(IPoolManager _manager) {
        manager = _manager;
        owner = msg.sender;
    }

    struct PoolData {
        PoolKey key;
        int24 tickLower;
        int24 tickUpper;
        uint160 currentSqrtPriceX96;
        uint256 amount0;
        uint256 amount1;
    }

    function runSeed(PoolData[] calldata pools) external {
        require(msg.sender == owner, "Only owner");
        manager.unlock(abi.encode(Action.SEED_LIQUIDITY, abi.encode(pools)));
    }

    struct SwapTask {
        PoolKey key;
        bool zeroForOne;
        int256 amountSpecified;
        address pointsRecipient;
    }

    function runSwaps(SwapTask[] calldata swaps) external {
        require(msg.sender == owner, "Only owner");
        manager.unlock(abi.encode(Action.EXECUTE_SWAPS, abi.encode(swaps)));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "Only manager");
        (Action action, bytes memory payload) = abi.decode(data, (Action, bytes));

        if (action == Action.SEED_LIQUIDITY) {
            PoolData[] memory pools = abi.decode(payload, (PoolData[]));
            for (uint256 i = 0; i < pools.length; i++) {
                _addLiquidity(pools[i]);
            }
        } else if (action == Action.EXECUTE_SWAPS) {
            SwapTask[] memory swaps = abi.decode(payload, (SwapTask[]));
            for (uint256 i = 0; i < swaps.length; i++) {
                _doSwap(swaps[i]);
            }
        }

        return "";
    }

    function _addLiquidity(PoolData memory p) internal {
        uint160 sqrtA = TickMath.getSqrtPriceAtTick(p.tickLower);
        uint160 sqrtB = TickMath.getSqrtPriceAtTick(p.tickUpper);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            p.currentSqrtPriceX96,
            sqrtA,
            sqrtB,
            p.amount0,
            p.amount1
        );

        (BalanceDelta delta,) = manager.modifyLiquidity(
            p.key,
            ModifyLiquidityParams({
                tickLower: p.tickLower,
                tickUpper: p.tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: bytes32(0)
            }),
            ""
        );

        _settleDelta(p.key, delta);
    }

    function _doSwap(SwapTask memory task) internal {
        uint160 limit = task.zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1;
        bytes memory hookData = abi.encode(task.pointsRecipient);

        BalanceDelta delta = manager.swap(
            task.key,
            SwapParams({
                zeroForOne: task.zeroForOne,
                amountSpecified: task.amountSpecified,
                sqrtPriceLimitX96: limit
            }),
            hookData
        );

        _settleDelta(task.key, delta);
    }

    function _settleDelta(PoolKey memory key, BalanceDelta delta) internal {
        // Handle currency0
        if (delta.amount0() < 0) {
            uint256 pay0 = uint256(uint128(-delta.amount0()));
            manager.sync(key.currency0);
            IERC20Minimal(Currency.unwrap(key.currency0)).transfer(address(manager), pay0);
            manager.settle();
        } else if (delta.amount0() > 0) {
            manager.take(key.currency0, address(this), uint256(uint128(delta.amount0())));
        }

        // Handle currency1
        if (delta.amount1() < 0) {
            uint256 pay1 = uint256(uint128(-delta.amount1()));
            manager.sync(key.currency1);
            IERC20Minimal(Currency.unwrap(key.currency1)).transfer(address(manager), pay1);
            manager.settle();
        } else if (delta.amount1() > 0) {
            manager.take(key.currency1, address(this), uint256(uint128(delta.amount1())));
        }
    }

    function withdraw(address token) external {
        require(msg.sender == owner, "Only owner");
        uint256 bal = IERC20Minimal(token).balanceOf(address(this));
        if (bal > 0) {
            IERC20Minimal(token).transfer(owner, bal);
        }
    }
}

contract SeedLiquidityAndSwap is Script {
    function run() external {
        address poolManagerAddr = vm.envAddress("POOLMANAGER_ADDRESS");
        address pointsHookAddr = vm.envAddress("POINTSHOOK_ADDRESS");
        address bal = vm.envAddress("BAL_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address wltc = vm.envAddress("WLTC_ADDRESS");
        address soft = vm.envAddress("SOFT_ADDRESS");
        address monke = vm.envAddress("MONKE_ADDRESS");
        address deployer = vm.envAddress("DEPLOYER_WALLET");

        IPoolManager pm = IPoolManager(poolManagerAddr);

        vm.startBroadcast();

        // 1. Deploy runner
        PoolActionRunner runner = new PoolActionRunner(pm);
        console.log("PoolActionRunner deployed at:", address(runner));

        // 2. Fund runner from deployer
        IERC20Minimal(wltc).transfer(address(runner), 50 ether);
        IERC20Minimal(bal).transfer(address(runner), 50_000 ether);
        IERC20Minimal(soft).transfer(address(runner), 50_000 ether);
        IERC20Minimal(monke).transfer(address(runner), 500_000 ether);
        IERC20Minimal(usdc).transfer(address(runner), 10_000 * 1e6); // 10,000 USDC

        console.log("Runner funded with initial liquidity reserves");

        // 3. Define the 5 pools
        PoolKey memory k1 = PoolKey({
            currency0: Currency.wrap(wltc),
            currency1: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        PoolKey memory k2 = PoolKey({
            currency0: Currency.wrap(wltc),
            currency1: Currency.wrap(bal),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(pointsHookAddr)
        });

        PoolKey memory k3 = PoolKey({
            currency0: Currency.wrap(bal),
            currency1: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(pointsHookAddr)
        });

        PoolKey memory k4 = PoolKey({
            currency0: Currency.wrap(soft),
            currency1: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(pointsHookAddr)
        });

        PoolKey memory k5 = PoolKey({
            currency0: Currency.wrap(monke),
            currency1: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        // 4. Seed liquidity for all 5 pools
        PoolActionRunner.PoolData[] memory seedData = new PoolActionRunner.PoolData[](5);

        // Pool 1: WLTC / USDC (~-230271)
        seedData[0] = PoolActionRunner.PoolData({
            key: k1,
            tickLower: -260280,
            tickUpper: -200280,
            currentSqrtPriceX96: 792281625142643375935439,
            amount0: 10 ether,
            amount1: 1_000 * 1e6
        });

        // Pool 2: WLTC / BAL (~69081)
        seedData[1] = PoolActionRunner.PoolData({
            key: k2,
            tickLower: 39060,
            tickUpper: 99060,
            currentSqrtPriceX96: 2505414483750479311864138015696,
            amount0: 10 ether,
            amount1: 10_000 ether
        });

        // Pool 3: BAL / USDC (~-299352)
        seedData[2] = PoolActionRunner.PoolData({
            key: k3,
            tickLower: -329340,
            tickUpper: -269340,
            currentSqrtPriceX96: 25054144837504793118641,
            amount0: 10_000 ether,
            amount1: 1_000 * 1e6
        });

        // Pool 4: SOFT / USDC (~-299352)
        seedData[3] = PoolActionRunner.PoolData({
            key: k4,
            tickLower: -329340,
            tickUpper: -269340,
            currentSqrtPriceX96: 25054144837504793118641,
            amount0: 10_000 ether,
            amount1: 1_000 * 1e6
        });

        // Pool 5: MONKE / USDC (~-345406)
        seedData[4] = PoolActionRunner.PoolData({
            key: k5,
            tickLower: -375420,
            tickUpper: -315420,
            currentSqrtPriceX96: 2505414483750479311864,
            amount0: 200_000 ether,
            amount1: 200 * 1e6
        });

        console.log("Seeding liquidity across 5 pools...");
        runner.runSeed(seedData);
        console.log("Liquidity seeded successfully!");

        // 5. Execute 5 swaps
        PoolActionRunner.SwapTask[] memory swapTasks = new PoolActionRunner.SwapTask[](5);

        // Swap 1: Swap 0.5 WLTC for USDC in Pool 1
        swapTasks[0] = PoolActionRunner.SwapTask({
            key: k1,
            zeroForOne: true,
            amountSpecified: -0.5 ether,
            pointsRecipient: deployer
        });

        // Swap 2: Swap 0.2 WLTC for BAL in Pool 2 (earn Points)
        swapTasks[1] = PoolActionRunner.SwapTask({
            key: k2,
            zeroForOne: true,
            amountSpecified: -0.2 ether,
            pointsRecipient: deployer
        });

        // Swap 3: Swap 100 BAL for USDC in Pool 3 (earn Points)
        swapTasks[2] = PoolActionRunner.SwapTask({
            key: k3,
            zeroForOne: true,
            amountSpecified: -100 ether,
            pointsRecipient: deployer
        });

        // Swap 4: Swap 100 SOFT for USDC in Pool 4 (earn Points)
        swapTasks[3] = PoolActionRunner.SwapTask({
            key: k4,
            zeroForOne: true,
            amountSpecified: -100 ether,
            pointsRecipient: deployer
        });

        // Swap 5: Swap 20,000 MONKE for USDC in Pool 5
        swapTasks[4] = PoolActionRunner.SwapTask({
            key: k5,
            zeroForOne: true,
            amountSpecified: -20_000 ether,
            pointsRecipient: deployer
        });

        console.log("Executing swaps across pools...");
        runner.runSwaps(swapTasks);
        console.log("Swaps executed successfully!");

        // 6. Return remaining balances to deployer
        runner.withdraw(wltc);
        runner.withdraw(bal);
        runner.withdraw(soft);
        runner.withdraw(monke);
        runner.withdraw(usdc);

        vm.stopBroadcast();
        console.log("All operations completed and tokens returned to deployer!");
    }
}
