// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract Init5Pools is Script {
    function run() external {
        address poolManagerAddr = vm.envAddress("POOLMANAGER_ADDRESS");
        address pointsHookAddr = vm.envAddress("POINTSHOOK_ADDRESS");
        address bal = vm.envAddress("BAL_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address wltc = vm.envAddress("WLTC_ADDRESS");
        address soft = vm.envAddress("SOFT_ADDRESS");
        address monke = vm.envAddress("MONKE_ADDRESS");

        IPoolManager pm = IPoolManager(poolManagerAddr);

        vm.startBroadcast();

        // Pool 1: WLTC / USDC (fee 3000, spacing 60, no hook) - 1 WLTC = 100 USDC
        PoolKey memory k1 = PoolKey({
            currency0: Currency.wrap(wltc),
            currency1: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
        pm.initialize(k1, 792281625142643375935439);

        // Pool 2: WLTC / BAL (fee 3000, spacing 60, PointsHook) - 1 WLTC = 1,000 BAL
        PoolKey memory k2 = PoolKey({
            currency0: Currency.wrap(wltc),
            currency1: Currency.wrap(bal),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(pointsHookAddr)
        });
        pm.initialize(k2, 2505414483750479311864138015696);

        // Pool 3: BAL / USDC (fee 3000, spacing 60, PointsHook) - 1 BAL = 0.10 USDC
        PoolKey memory k3 = PoolKey({
            currency0: Currency.wrap(bal),
            currency1: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(pointsHookAddr)
        });
        pm.initialize(k3, 25054144837504793118641);

        // Pool 4: SOFT / USDC (fee 3000, spacing 60, PointsHook) - 1 SOFT = 0.10 USDC
        PoolKey memory k4 = PoolKey({
            currency0: Currency.wrap(soft),
            currency1: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(pointsHookAddr)
        });
        pm.initialize(k4, 25054144837504793118641);

        // Pool 5: MONKE / USDC (fee 3000, spacing 60, no hook) - 1 MONKE = 0.001 USDC
        PoolKey memory k5 = PoolKey({
            currency0: Currency.wrap(monke),
            currency1: Currency.wrap(usdc),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
        pm.initialize(k5, 2505414483750479311864);

        vm.stopBroadcast();

        console.log("5 pools initialized successfully on-chain!");
    }
}
