// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {IPositionDescriptor} from "@uniswap/v4-periphery/src/interfaces/IPositionDescriptor.sol";
import {PositionDescriptor} from "@uniswap/v4-periphery/src/PositionDescriptor.sol";
import {PositionManager} from "@uniswap/v4-periphery/src/PositionManager.sol";
import {IWETH9} from "@uniswap/v4-periphery/src/interfaces/external/IWETH9.sol";
import {WETH} from "solmate/src/tokens/WETH.sol";

contract DeployPositionManager is Script {
    function run() external {
        // Already deployed contracts
        address poolManagerAddr = vm.envAddress("POOLMANAGER_ADDRESS");
        address permit2Addr = vm.envAddress("PERMIT2_ADDRESS");
        address wethAddr = vm.envOr("WETH_ADDRESS", address(0));
        address descriptorAddr = vm.envOr("POSITION_DESCRIPTOR", address(0));

        console.log("PoolManager:", poolManagerAddr);
        console.log("Permit2:", permit2Addr);

        vm.startBroadcast();

        // 1. Deploy WETH if not provided
        if (wethAddr == address(0)) {
            WETH weth = new WETH();
            wethAddr = address(weth);
            console.log("WETH deployed at:", wethAddr);
        } else {
            console.log("Using existing WETH:", wethAddr);
        }

        // 2. Deploy PositionDescriptor if not provided
        if (descriptorAddr == address(0)) {
            bytes32 nativeCurrencyLabel = bytes32("LTC");
            PositionDescriptor descriptor = new PositionDescriptor(
                IPoolManager(poolManagerAddr),
                wethAddr,
                nativeCurrencyLabel
            );
            descriptorAddr = address(descriptor);
            console.log("PositionDescriptor deployed at:", descriptorAddr);
        } else {
            console.log("Using existing PositionDescriptor:", descriptorAddr);
        }

        // 3. Deploy PositionManager
        uint256 unsubscribeGasLimit = 100_000;
        PositionManager positionManager = new PositionManager(
            IPoolManager(poolManagerAddr),
            IAllowanceTransfer(permit2Addr),
            unsubscribeGasLimit,
            IPositionDescriptor(descriptorAddr),
            IWETH9(wethAddr)
        );
        console.log("PositionManager deployed at:", address(positionManager));

        vm.stopBroadcast();
    }
}
