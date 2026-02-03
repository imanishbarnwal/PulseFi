
export interface AgentConfig {
    sessionId: string;
    ethPriceApiUrl?: string; // Optional custom feed
    checkIntervalMs?: number; // Default 60000
    mode?: 'REBALANCE' | 'MARKET_SCAN' | 'IDLE';
    isDemo?: boolean;
}

export interface AgentState {
    sessionId: string;
    isRunning: boolean;
    startEthPrice: number;
    tradeCount: number;
    totalLoss: number;
    logs: string[];
    mode?: string;
    isDemo?: boolean;
    remainingBalance?: number;
}
