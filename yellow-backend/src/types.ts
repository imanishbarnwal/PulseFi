export * from './types-agent';
import { ethers } from 'ethers';

// In a real scenario, these types would be imported from @erc7824/nitrolite
// Creating interfaces based on expected SDK behavior
export interface YellowSessionConfig {
    networkUrl: string;
    clearnodeUrl: string;
    privateKey: string; // Backend wallet (Counterparty)
}

export interface ActionLog {
    id: string;
    type: string;
    description: string;
    cost: number;
    timestamp: number;
}

export type AgentDecisionType = 'ROUTE_CHECK' | 'MARKET_SCAN' | 'EXECUTION' | 'NO_OP';

export interface AgentDecision {
    timestamp: number;
    decisionType: AgentDecisionType;
    reasoning: string[];
    confidence: number;
    impactEstimate: string;
    data?: any;
}

export type AgentStrategy = 'ACTIVE_REBALANCE' | 'HIGH_FREQ_SCAN' | 'IDLE_LOG_ONLY';

export interface SessionState {
    sessionId: string;
    userAddress: string;
    sessionKey: string;
    startTime: number;
    initialBalance: number;
    remainingBalance: number;
    escrowBalance: number;
    actionsExecuted: number;
    actionHistory: ActionLog[];
    decisions: AgentDecision[];
    strategy?: AgentStrategy;
    status: 'ACTIVE' | 'SETTLED';
    settlementTxHash?: string;
}

export interface StartSessionResponse {
    sessionId: string;
    // sessionKey removed - secure backend only
    startTimestamp: number;
}

export interface EndSessionResponse {
    settlementTxHash: string;
    finalBalance: number;
    totalTrades: number;
    gasSpentUSD: number;
    gasSavedUSD: number;
}
