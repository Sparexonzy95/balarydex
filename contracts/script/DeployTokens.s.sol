// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";

contract DeployTokens is Script {
    function run() external {
        address mintTo = vm.envAddress("ADDRESS_TO_MINT_TO");
        uint256 supply = 10_000_000_000;

        vm.startBroadcast();

        // MockERC20 tokenA = new MockERC20("Flux",     "FLUX", 18, supply * 10 ** 18, mintTo);
        // MockERC20 tokenB = new MockERC20("Honey",    "HNY",  18, supply * 10 ** 18, mintTo);
        // MockERC20 tokenC = new MockERC20("UniCrypt", "UNCX", 18, supply * 10 ** 18, mintTo);
        // MockERC20 tokenD = new MockERC20("Zilliqa",  "ZIL",  18, supply * 10 ** 18, mintTo);

        // console.log("FLUX:", address(tokenA));
        // console.log("HNY:",  address(tokenB));
        // console.log("UNCX:", address(tokenC));
        // console.log("ZIL:",  address(tokenD));

        MockERC20 tokenBAL = new MockERC20("Balary", "BAL", 18, supply * 10 ** 18, mintTo);
        MockERC20 tokenUSDC = new MockERC20("USD Coin", "USDC", 6, supply * 10 ** 6, mintTo);
        MockERC20 tokenWLTC = new MockERC20("Wrapped Litecoin", "WLTC", 18, supply * 10 ** 18, mintTo);
        MockERC20 tokenSOFT = new MockERC20("SoftDAO", "SOFT", 18, supply * 10 ** 18, mintTo);
        MockERC20 tokenMONKE = new MockERC20("MONKE", "MONKE", 18, supply * 10 ** 18, mintTo);

        console.log("BAL (Balary):", address(tokenBAL));
        console.log("USDC:", address(tokenUSDC));
        console.log("WLTC:", address(tokenWLTC));
        console.log("SOFT:", address(tokenSOFT));
        console.log("MONKE:", address(tokenMONKE));

        // 0x8c277c071D42987Ef7712d135C4da1f46EA8Af8d
        // 0x10a2A353598E85Ea959B9176a6432a63C086A1Be
        // 0x57700E377d85328322574FB8d92d4F017a2106E2

        // add tokens to faucet contract
        // send 1 million of each to faucet ca - 0xB777176ea921D4aA8Ab9aD6163c8bafacdCbeD44
        


        vm.stopBroadcast();
    }
}
