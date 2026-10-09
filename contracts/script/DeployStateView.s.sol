// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {StateView} from "@uniswap/v4-periphery/src/lens/StateView.sol";

contract DeployStateView is Script {
    function run() external returns (StateView stateView) {
        address poolManagerAddr = vm.envAddress("POOLMANAGER_ADDRESS");
        
        console.log("Deploying StateView with PoolManager at:", poolManagerAddr);

        vm.startBroadcast();

        // Deploy StateView
        stateView = new StateView(IPoolManager(poolManagerAddr));

        vm.stopBroadcast();

        console.log("StateView deployed at:", address(stateView));
    }
}
