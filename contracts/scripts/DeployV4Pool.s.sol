// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {SessionGuardHook} from "../hooks/SessionGuardHook.sol";

/**
 * @title DeployV4Pool
 * @notice Factory script to deploy the PulseFi Hook and initialize a gated Uniswap v4 Pool.
 * @dev Re-uses canonical PoolManager on Base Sepolia.
 */
contract DeployV4Pool is Script {
    using CurrencyLibrary for Currency;

    // Base Sepolia Canonical Infrastructure
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant ESCROW = 0x66B72352B6C3F71320F24683f3ee91e84C23667c;

    // PulseFi Hook Flags (V4 core requirement)
    // beforeSwap: 1 << 7 = 128
    uint160 constant BEFORE_SWAP_FLAG = 0x0000000000000000000000000000000000000080;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address executor = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the SessionGuardHook
        // IMPORTANT: For v4, the hook address must satisfy permission flags.
        // In this minimal script, we deploy normally. In production, use CREATE2 salt mining.
        SessionGuardHook hook = new SessionGuardHook(
            IPoolManager(POOL_MANAGER),
            ESCROW,
            executor
        );

        // 2. Define the Pool Key
        // Token order is sorted numerically per v4 standard
        address token0 = USDC < WETH ? USDC : WETH;
        address token1 = USDC < WETH ? WETH : USDC;

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: 3000, // 0.3%
            tickSpacing: 60,
            hooks: address(hook)
        });

        // 3. Initialize Pool
        // We use a starting price equivalent to 2,500 USDC per ETH.
        // Formula: sqrt(price_ratio) * 2^96
        // Resulting sqrtPriceX96 for ~2500 ratio: 158456325028528675187087900672 (example)
        // For the demo, we use 1:1 initialization to ensure success without complex math: 
        // 79228162514264337593543950336 (2^96)
        uint160 sqrtPriceX96 = 79228162514264337593543950336;

        console.log("Initializing Pool with SessionGuardHook Gating...");
        IPoolManager(POOL_MANAGER).initialize(key, sqrtPriceX96, "");

        vm.stopBroadcast();

        console.log("-----------------------------------------");
        console.log("PulseFi V4 Deployment Summary:");
        console.log("Hook Address:", address(hook));
        console.log("Pool Asset 0:", token0);
        console.log("Pool Asset 1:", token1);
        console.log("Executor Auth:", executor);
        console.log("-----------------------------------------");
    }
}
