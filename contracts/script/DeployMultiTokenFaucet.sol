// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MultiTokenFaucet.sol";

contract DeployFaucet is Script {
    function run() external {

        // --- Configure Balary tokens from env ---
        address bal = vm.envAddress("BAL_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address wltc = vm.envAddress("WLTC_ADDRESS");
        address soft = vm.envAddress("SOFT_ADDRESS");
        address monke = vm.envAddress("MONKE_ADDRESS");

        address[] memory tokens = new address[](5);
        tokens[0] = bal;
        tokens[1] = usdc;
        tokens[2] = wltc;
        tokens[3] = soft;
        tokens[4] = monke;

        uint256[] memory amounts = new uint256[](5);
        amounts[0] = 500 * 10 ** 18; // BAL
        amounts[1] = 500 * 10 ** 6;  // USDC (6 decimals)
        amounts[2] = 500 * 10 ** 18; // WLTC
        amounts[3] = 500 * 10 ** 18; // SOFT
        amounts[4] = 500 * 10 ** 18; // MONKE

        vm.startBroadcast();

        MultiTokenFaucet faucet = new MultiTokenFaucet(tokens, amounts);

        // Set cooldown to 3 minutes
        faucet.setCooldown(3 minutes);

        // Fund faucet from deployer
        IERC20(bal).transfer(address(faucet), 1_000_000 * 10 ** 18);
        IERC20(usdc).transfer(address(faucet), 1_000_000 * 10 ** 6);
        IERC20(wltc).transfer(address(faucet), 1_000_000 * 10 ** 18);
        IERC20(soft).transfer(address(faucet), 1_000_000 * 10 ** 18);
        IERC20(monke).transfer(address(faucet), 1_000_000 * 10 ** 18);

        vm.stopBroadcast();

        console.log("MultiTokenFaucet deployed at:", address(faucet));
        console.log("MultiTokenFaucet funded with 1,000,000 of each token.");
    }
}