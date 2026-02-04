// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BaseHook} from "v4-periphery/src/base/hooks/BaseHook.sol";

/**
 * @title ISessionEscrow
 * @notice Minimal interface for the PulseFi SessionEscrow contract.
 */
interface ISessionEscrow {
    function spend(bytes32 sessionId, address recipient, uint256 amount) external;
    function sessions(bytes32 sessionId) external view returns (address owner, uint256 balance);
    function usdc() external view returns (address);
}

/**
 * @title SessionGuardHook
 * @author PulseFi Protocol Team
 * @notice A Uniswap v4 Hook that gate-keeps capital deployment via on-chain sessions.
 * @dev This hook intercepts swaps to verify that they are initiated by a trusted executor
 * and are backed by a verifiable session escrow. It pulls funds JIT into the PoolManager.
 */
contract SessionGuardHook is BaseHook {
    using CurrencyLibrary for Currency;

    /// @notice The immutable address of the SessionEscrow contract.
    ISessionEscrow public immutable escrow;

    /// @notice The centralized executor address authorized to trigger agentic swaps.
    address public immutable trustedExecutor;

    /// @notice Emitted when a swap is successfully funded via a session.
    event SessionSwapExecuted(bytes32 indexed sessionId, address indexed pool, uint256 amountIn);

    error NotTrustedExecutor();
    error InsufficientSessionBalance();
    error InvalidHookData();

    /**
     * @param _poolManager The Uniswap v4 PoolManager address.
     * @param _escrow The address of the PulseFi SessionEscrow contract.
     * @param _executor The backend wallet address authorized to execute trades.
     */
    constructor(IPoolManager _poolManager, address _escrow, address _executor) BaseHook(_poolManager) {
        escrow = ISessionEscrow(_escrow);
        trustedExecutor = _executor;
    }

    /**
     * @inheritdoc BaseHook
     */
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true, // Core security gate
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /**
     * @notice Atomic verification and funding logic executed before a swap.
     * @param sender The address that initiated the swap on the PoolManager.
     * @param key The PoolKey representing the pool being traded.
     * @param params Basic swap parameters (amount, direction, etc.).
     * @param hookData Encoded bytes containing (bytes32 sessionId, uint256 maxAmountIn).
     * @return selector The function selector for beforeSwap.
     * @return delta The delta to return to the PoolManager (zero in this case).
     * @return fee The hook-specific fee (not used).
     */
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override poolManagerOnly returns (bytes4, BeforeSwapDelta, uint24) {
        // 1. Trust Gate: Only the authorized backend solver can trigger session-based swaps.
        if (sender != trustedExecutor) revert NotTrustedExecutor();

        // 2. Extract Context: Resolve session ID and safety limits from the call data.
        if (hookData.length < 64) revert InvalidHookData();
        (bytes32 sessionId, uint256 maxAmountIn) = abi.decode(hookData, (bytes32, uint256));

        // 3. Currency Validation: Only spend if currency0 is the escrow's USDC
        if (key.currency0 != Currency.wrap(escrow.usdc())) revert InvalidHookData();

        // 4. Deterministic Amount: Resolve exact input required.
        uint256 amountIn = params.amountSpecified < 0 
            ? uint256(-params.amountSpecified) 
            : maxAmountIn;

        // 5. Atomic Funding: Direct the SessionEscrow to fund the PoolManager.
        // Note: The SessionEscrow must have this Hook as an authorized executor for the 'spend' call.
        escrow.spend(sessionId, address(poolManager), amountIn);

        emit SessionSwapExecuted(sessionId, address(poolManager), amountIn);

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }
}
