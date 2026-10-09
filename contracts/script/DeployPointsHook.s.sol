// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

import {PointsHook} from "../src/PointsHook.sol";


/// @notice Mines the address and deploys the PointsHook.sol Hook contract
contract DeployPointsHook is Script {

    function setUp() public {}

    function run() public {
        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG);
        address POOLMANAGER = vm.envAddress("POOLMANAGER_ADDRESS");

        // Mine a salt that will produce a hook address with the correct flags
        bytes memory constructorArgs = abi.encode(POOLMANAGER);
        (address hookAddress, bytes32 salt) =
            HookMiner.find(CREATE2_FACTORY, flags, type(PointsHook).creationCode, constructorArgs);

        // Deploy the hook using CREATE2
        vm.broadcast();
        PointsHook pointsHook = new PointsHook{salt: salt}(IPoolManager(POOLMANAGER));
        require(address(pointsHook) == hookAddress, "PointsHookScript: hook address mismatch");
        console.log("PointsHook deployed at:", address(pointsHook));
    }
}