// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {SessionGuardHook} from "../hooks/SessionGuardHook.sol";

/**
 * @title DeployPulseFiV4
 * @notice Deploys the SessionGuardHook and initializes a gated v4 Pool on Base Sepolia.
 */
contract DeployPulseFiV4 is Script {
    using CurrencyLibrary for Currency;

    // Base Sepolia Addresses
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant ESCROW = 0x66B72352B6C3F71320F24683f3ee91e84C23667c;

    // Hook Flags: beforeSwap (0x80)
    // In production, use CREATE2 to find a salt that produces an address ending in ...1xxx
    // For this demo script, we deploy directly, assuming demo environment flexibilities.

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address executor = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy SessionGuardHook
        SessionGuardHook hook = new SessionGuardHook(
            IPoolManager(POOL_MANAGER),
            ESCROW,
            executor
        );
        console.log("Deployed SessionGuardHook at:", address(hook));

        // 2. Configure Pool Key
        // Ensure token0 < token1
        address token0 = USDC < WETH ? USDC : WETH;
        address token1 = USDC < WETH ? WETH : USDC;

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: 3000,
            tickSpacing: 60,
            hooks: address(hook)
        });

        // 3. Initialize Pool
        // SqrtPriceX96 for 1:1, roughly 79228162514264337593543950336
        uint160 sqrtPriceX96 = 79228162514264337593543950336;
        
        // Note: Canonical PoolManager.initialize requires salt or extra data typically empty for basic pools
        IPoolManager(POOL_MANAGER).initialize(key, sqrtPriceX96, "");
        console.log("Initialized USDC/WETH Pool with Hook Gating");

        vm.stopBroadcast();
    }
}
