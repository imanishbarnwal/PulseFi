
import axios from 'axios';

// Ensure backend is running!
const API_URL = 'http://localhost:3000';

export interface StartSessionResponse {
    sessionId: string;
    sessionKey: string; // Internal key (encrypted/secure in real apps)
    startTimestamp: number;
    txHash?: string; // On-chain Session Creation Tx
}

export interface EndSessionResponse {
    settlementTxHash: string;
    finalBalance: number;
    actionsExecuted: number;
    executionTxs?: string[]; // spend, swap, etc.
}

export interface AgentStatus {
    sessionId: string;
    isRunning: boolean;
    logs: string[];
    tradeCount: number;
    remainingBalance: number;
    escrowBalance: number;
    isDemo: boolean;
}

export const api = {
    adminStartSession: async (walletAddress: string, amount: number): Promise<StartSessionResponse> => {
        const res = await axios.post(`${API_URL}/start-session`, { walletAddress, amount });
        return res.data;
    },

    adminEndSession: async (sessionId: string): Promise<EndSessionResponse> => {
        const res = await axios.post(`${API_URL}/end-session`, { sessionId });
        return res.data;
    },

    startAgent: async (sessionId: string, mode: string = 'REBALANCE') => {
        const res = await axios.post(`${API_URL}/start-agent`, { sessionId, checkIntervalMs: 5000, mode });
        return res.data;
    },

    getAgentStatus: async (sessionId: string): Promise<AgentStatus> => {
        const res = await axios.get(`${API_URL}/agent/${sessionId}`);
        return res.data;
    },

    getEscrowAddress: async (): Promise<string> => {
        const res = await axios.get(`${API_URL}/api/escrow-address`);
        return res.data.address;
    },

    forceTrade: async (sessionId: string) => {
        const res = await axios.post(`${API_URL}/force-trade`, { sessionId });
        return res.data;
    }
};
