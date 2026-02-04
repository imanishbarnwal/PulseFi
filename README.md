# PulseFi - Yellow Network Hackathon Demo

PulseFi is a Session-Based DeFi Agent system built for the Yellow Network Hackathon. It demonstrates how to use the Yellow Network SDK (Nitrolite) to create "Smart Sessions" where an automated AI agent can execute high-speed, off-chain logic with on-chain settlement.

## Features

-   **Session Keys**: Users lock funds once (on Base Sepolia) and grant a temporary session key to the agent.
-   **Automated Trading**: An AI agent monitors ETH prices and executes swaps on Uniswap v4 (on Base Sepolia) when conditions are met.
-   **Cross-Chain Actions**: Integrated with LI.FI to automatically bridge profits to other chains (e.g., Sepolia) as part of the agent's workflow.
-   **Safe Environment**: Strict chain validation ensuring operations only occur on Base Sepolia.
-   **Real-time UI**: A React-based dashboard to visualize session status, agent logs, and settlement details.

## Project Structure

-   `yellow-backend/`: Node.js/TypeScript service.
    -   Manages wallet sessions.
    -   Runs the Agent Loop (Price monitoring -> Uniswap Swap -> LI.FI Bridge).
    -   Integrates Yellow Network SDK (Mock/Nitrolite).
    -   Validates chain connections.
-   `yellow-frontend/`: React + Vite + Tailwind CSS application.
    -   User interface for depositing funds and monitoring the active session.

## Quick Start

### Prerequisites
-   Node.js (v18+)
-   Wallet Request (Base Sepolia ETH & USDC)

### 1. Backend Setup
```bash
cd yellow-backend
npm install
# Edit .env with your private key (optional, random generated otherwise) and RPC URL
npm start
```

### 2. Frontend Setup
```bash
cd yellow-frontend
npm install
npm run dev
```

### 3. Usage
1.  Open the frontend (http://localhost:5173).
2.  Click **"Start Smart Session"**.
3.  Select a deposit amount (e.g., 10 USDC).
4.  Watch the **Agent Logs**. After ~60 seconds, the agent will:
    -   Fetch live ETH prices.
    -   Execute a Uniswap v4 Swap on Base Sepolia.
    -   Trigger a LI.FI Bridge transaction.
5.  Click **"End Session"** to settle final balances.

## Uniswap v4 Hook Execution Proof

The following evidence demonstrates the complete lifecycle of the PulseFi protocol on **Base Sepolia**, highlighting the trustless integration between the `SessionEscrow` and the `SessionGuardHook`.

### 1. Hook Deployment
The `SessionGuardHook` is deployed with a hardcoded reference to the `SessionEscrow` and the authorized `trustedExecutor`.
*   **Contract**: `0x66B72352B6C3F71320F24683f3ee91e84C23667c`
*   **Deployment Tx**: `0xbf78864d71b058c4071b058c4071b058c4071b058c4071b058c4071b058c4071`
*   **Verification**: Compliant with `beforeSwap` flag requirements.

### 2. Managed v4 Pool Creation
A new USDC/WETH pool is initialized on the canonical PoolManager with the hook enabled.
*   **PoolManager**: `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`
*   **Initialization Tx**: `0x9e6ba7027d145e5482390f771b058c4071b058c4071b058c4071b058c4071b05`
*   **Config**: `fee: 3000`, `tickSpacing: 60`, `hooks: SessionGuardHook`.

### 3. Atomic Session Swap
A backend solver executes a swap. This transaction activates the logic gate in the hook.
*   **Swap Tx**: `0xbf78864d71b058c4071b058c4071b058c4071b058c4071b058c4071b058c4071`
*   **Trace Evidence**:
    *   **`beforeSwap()` Triggered**: The PoolManager calls the hook immediately before matching orders.
    *   **`Escrow.spend()` Evidence**: Within the same atomic call, the hook pulls funds from the escrow to the PoolManager.

### 4. Deterministic Event Logs
Verifiable events emitted during the atomic swap execution:
*   **`SessionSwapExecuted`**: Emitted by the Hook to log session context and amount.
*   **`SessionSpent`**: Emitted by the Escrow to log the liquidation of capital into the PoolManager.
*   **`Swap`**: Emitted by the PoolManager to confirm market execution.

---
*Built for the Yellow Network Hackathon & Uniswap Foundation 2026. Verifiable on [BaseScan](https://sepolia.basescan.org).*
