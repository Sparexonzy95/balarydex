// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-hooks-public/lib/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {SignedMath} from "@openzeppelin/contracts/utils/math/SignedMath.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ERC1155} from "solmate/src/tokens/ERC1155.sol";

contract PointsHook is BaseHook, ERC1155, Ownable, Pausable {
    using PoolIdLibrary for PoolKey;

    struct Campaign {
        bool isConfigured;
        bool active;
        uint256 endTime;
        uint256 maxPointsPerSwap;
    }

    mapping(PoolId => Campaign) public campaigns;

    event CampaignConfigured(PoolId indexed poolId, bool active, uint256 endTime, uint256 maxPointsPerSwap);
    event PointsAwarded(address indexed user, PoolId indexed poolId, uint256 points);

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) Ownable(msg.sender) {}

    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterAddLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: false,
                afterSwap: true,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    function setCampaign(
        PoolId poolId,
        bool active,
        uint256 endTime,
        uint256 maxPointsPerSwap
    ) external onlyOwner {
        campaigns[poolId] = Campaign({
            isConfigured: true,
            active: active,
            endTime: endTime,
            maxPointsPerSwap: maxPointsPerSwap
        });
        emit CampaignConfigured(poolId, active, endTime, maxPointsPerSwap);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _assignPoints(PoolId poolId, bytes calldata hookData, uint256 points) internal {
        // Prevent revert on malformed or empty hookData
        if (hookData.length < 32 || points == 0) return;

        address user = abi.decode(hookData, (address));
        if (user == address(0)) return;

        Campaign memory camp = campaigns[poolId];
        if (camp.isConfigured) {
            if (!camp.active) return;
            if (camp.endTime > 0 && block.timestamp > camp.endTime) return;
            if (camp.maxPointsPerSwap > 0 && points > camp.maxPointsPerSwap) {
                points = camp.maxPointsPerSwap;
            }
        }

        uint256 tokenId = uint256(PoolId.unwrap(poolId));
        _mint(user, tokenId, points, "");
        emit PointsAwarded(user, poolId, points);
    }

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta delta,
        bytes calldata hookData
    ) internal override whenNotPaused returns (bytes4, int128) {
        // In Uniswap v4, negative delta is the token sent into the pool (input amount)
        int128 inputDelta = delta.amount0() < 0 ? delta.amount0() : delta.amount1();
        uint256 rawInput = SignedMath.abs(inputDelta);
        uint256 pointsToMint = rawInput / 100;

        _assignPoints(key.toId(), hookData, pointsToMint);

        return (this.afterSwap.selector, 0);
    }

    function uri(uint256) public pure override returns (string memory) {
        return "";
    }
}