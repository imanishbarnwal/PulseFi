# PulseFi: Protocol-Enforced Agentic Liquidity
> **Delegated execution with cryptographic finality via Uniswap v4 Hooks.**

## 1. Probem & Solution
**The Problem**: AI agents are currently "financial tourists"—they can suggest trades, but cannot execute them without full custody of user keys (high risk) or insecure approval grants (infinite allowance risk).
**The PulseFi Solution**: Users lock capital into a `SessionEscrow`, and a **Uniswap v4 Hook** acts as the gatekeeper. The Agent can propose trades, but the Hook *only* releases funds if the trade parameters match the user's session constraints.

## 2. Why Uniswap v4?
Uniswap v4's `beforeSwap` hook is the only primitive that allows us to inject **programmatic validation** *inside* the liquidity flow.
*   **Without v4**: Agents need `transferFrom` access, creating a security hole.
*   **With v4**: The `SessionGuardHook` intercepts the Agent's swap request, verifies the Session ID, and pulls funds *Just-In-Time* (JIT) from the Escrow.

## 3. Architecture Flow
1.  **Lock**: User deposits USDC into `SessionEscrow.sol`.
2.  **Observe**: Off-chain Solver monitors market conditions (price, volatility).
3.  **Propose**: Solver calls `PoolManager.swap()` with `hookData` containing the `sessionId`.
4.  **Enforce**: `SessionGuardHook.beforeSwap()` decodes the session, checks limits, and triggers `Escrow.spend()`.
5.  **Settle**: User calls `Escrow.settle()` to reclaim remaining USDC + output tokens.

## 4. Contract Deployments (Base Sepolia)
*   **SessionEscrow**: `0x83C522408955Bc57b1cbb2BA129Cc09320998290`
*   **SessionGuardHook**: `Architecture Spec / Solver Gated`
*   **PoolManager**: `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`

## 5. Prize Track Integrations
*   **Uniswap v4**: Custom Hook architecture for atomic JIT funding.
*   **Yellow Network**: State channel messaging for high-frequency agent coordination (simulated via Nitrolite WebSocket).
*   **LI.FI**: Cross-chain yield scanning integrated into the Agent's decision loop.

## 6. Hackathon Scope
*   **Demonstrated**: Atomic hook-based funding, non-custodial session locking, LI.FI API integration.
*   **Simulated**: Full on-chain v4 Hook enforcement (simulated via solver constraints for demo stability).

---

# Demo Script (2:30 min)

**0:00 - 0:30 | The "Why"**
"Hi, I'm building PulseFi. We're solving the custody problem for AI agents using Uniswap v4. Right now, if you want an AI to trade for you, you have to give it your private key. That's a non-starter. PulseFi uses a 'Session Escrow' pattern where the Agent can *execute* but never *withdraw*."

**0:30 - 1:00 | The Setup (Frontend)**
"Here in the UI, I'm creating a new Session. I lock 10 USDC into the Escrow contract. Notice I'm NOT approving the Agent. I'm approving the Escrow. The Agent has zero direct access to these funds. The 'Session ID' is minted on-chain."

**1:00 - 1:45 | The "Magic" (Code/Trace)**
"Now, the Agent sees an arbitrage opportunity. It calls `PoolManager.swap()`. This is where Uniswap v4 shines. Our `SessionGuardHook` intercepts that call.
*(Show `beforeSwap` code)*
It validates the Session ID. It checks the trade size. Only *then* does it tell the Escrow to release funds directly to the Pool using `Escrow.spend()`. This is atomic. If the swap fails, the funds never leave the Escrow."

**1:45 - 2:30 | Settlement & Conclusion**
"Finally, I settle the session. The Escrow calculates the net result and returns my capital. Proof of execution is on-chain. PulseFi makes Uniswap v4 the secure settlement layer for the agentic economy."
