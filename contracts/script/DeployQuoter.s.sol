// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {V4Quoter} from "@uniswap/v4-periphery/src/lens/V4Quoter.sol";

contract DeployQuoter is Script {
    function run() external returns (V4Quoter quoter) {

        address poolManagerAddr = vm.envAddress("POOLMANAGER_ADDRESS");
        
        console.log("Deploying V4Quoter with PoolManager at:", poolManagerAddr);

        vm.startBroadcast();

        // Deploy V4Quoter (v4 swap quoter)
        quoter = new V4Quoter(IPoolManager(poolManagerAddr));

        vm.stopBroadcast();

        console.log("V4Quoter deployed at:", address(quoter));
    }
}
