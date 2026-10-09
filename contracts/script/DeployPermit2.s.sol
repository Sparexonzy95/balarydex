// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {Permit2} from "permit2/src/Permit2.sol";

contract DeployPermit2 is Script {
    function run() external returns (Permit2 permit2) {
   
        console.log("Deploying Permit2");

        vm.startBroadcast();

        // Deploy Permit2
        permit2 = new Permit2();

        vm.stopBroadcast();

        console.log("Permit2 deployed at:", address(permit2));
    }
}

