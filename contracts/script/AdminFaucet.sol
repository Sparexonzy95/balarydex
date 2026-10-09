// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MultiTokenFaucet.sol";

contract AdminFaucet is Script {
    function run() external {
        address faucetAddress = vm.envAddress("FAUCET_ADDRESS");

        MultiTokenFaucet faucet = MultiTokenFaucet(faucetAddress);

        vm.startBroadcast();

        // --- Set cooldown ---
        // Uncomment and adjust as needed:
        // faucet.setCooldown(2 hours);
        // faucet.setCooldown(24 hours);
        // faucet.setCooldown(12 hours);

        // --- Update token amount for an existing token ---
        // faucet.setTokenAmount(0x36bEE8F2DF69Cf3AFAb5c5ccA973fEb6441cAb11, 500 * 10 ** 6); // mUSDC

        // --- Add a new token ---
        // 0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d
        // 0x10a2A353598E85Ea959B9176a6432a63C086A1Be
        // 0x57700E377d85328322574FB8d92d4F017a2106E2
        // faucet.setTokenAmount(0xNewTokenAddress, 500 * 10 ** 18);
        faucet.setTokenAmount(0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d, 500 * 10 ** 18);
        faucet.setTokenAmount(0x10a2A353598E85Ea959B9176a6432a63C086A1Be, 500 * 10 ** 18);
        faucet.setTokenAmount(0x57700E377d85328322574FB8d92d4F017a2106E2, 500 * 10 ** 18);


        vm.stopBroadcast();

        console.log("Cooldown is now:", faucet.cooldown());
    }
}

// forge script script/AdminFaucet.sol \
//   --rpc-url arc_testnet \
//   --account myWallet \
//   --sender 0x5Ac521f6814c2D09188A6838e7CDBfe7aEaC0cf9 \
//   --broadcast

  