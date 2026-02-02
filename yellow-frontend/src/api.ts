
import axios from 'axios';

// Ensure backend is running!
const API_URL = 'http://localhost:3000';

export interface StartSessionResponse {
    sessionId: string;
    sessionKey: string;
    startTimestamp: number;
}

export interface EndSessionResponse {
    settlementTxHash: string;
    finalBalance: number;
    actionsExecuted: number;
}

export interface AgentStatus {
    sessionId: string;
    isRunning: boolean;
    logs: string[];
    tradeCount: number;
}

export const api = {
    adminStartSession: async (walletAddress: string): Promise<StartSessionResponse> => {
        const res = await axios.post(`${API_URL}/start-session`, { walletAddress });
        return res.data;
    },

    adminEndSession: async (sessionId: string): Promise<EndSessionResponse> => {
        const res = await axios.post(`${API_URL}/end-session`, { sessionId });
        return res.data;
    },

    startAgent: async (sessionId: string) => {
        const res = await axios.post(`${API_URL}/start-agent`, { sessionId, checkIntervalMs: 5000 });
        return res.data;
    },

    getAgentStatus: async (sessionId: string): Promise<AgentStatus> => {
        const res = await axios.get(`${API_URL}/agent/${sessionId}`);
        return res.data;
    }
};
