# Yellow Network Session Backend

A minimal Node.js/TypeScript backend service that integrates with the Yellow Network SDK (Nitrolite) to manage session-based transactions.

## Features

- **Session Management**: Start and end sessions with off-chain state management.
- **Yellow Network Integration**: Simulates locking funds and settling on-chain using the Nitrolite test environment.
- **In-Memory State**: Fast, database-free session tracking.
- **TypeScript**: Typed and clean code structure.

## Prerequisites

- Node.js (v16+)
- npm or yarn

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configuration**:
    Edit `.env` and add your backend private key (optional for testing, random one is generated if missing).

3.  **Run the Server**:
    ```bash
    npm start
    ```

## API Endpoints

### `POST /start-session`
Starts a new session, locks funds, and generates a session key.

**Body**:
```json
{
  "walletAddress": "0xUserWalletAddress..."
}
```

**Response**:
```json
{
  "sessionId": "0x...",
  "sessionKey": "0x...",
  "startTimestamp": 1700000000000
}
```

### `POST /action`
Simulates an off-chain action (e.g., placing a trade, playing a game move) that spends the locked balance.

**Body**:
```json
{
  "sessionId": "0x...",
  "actionCost": 1.5
}
```

### `POST /end-session`
Ends the session and triggers on-chain settlement.

**Body**:
```json
{
  "sessionId": "0x..."
}
```

**Response**:
```json
{
  "settlementTxHash": "0x...",
  "finalBalance": 23.5
}
```

## Folder Structure

```
/src
  /controllers - API logic
  /services    - Yellow SDK integration
  /store       - In-memory state
  types.ts     - TypeScript definitions
  index.ts     - Server entry point
```
