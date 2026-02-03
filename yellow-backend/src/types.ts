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

export interface SessionState {
    sessionId: string;
    userAddress: string;
    sessionKey: string;
    startTime: number;
    initialBalance: number;
    remainingBalance: number;
    actionsExecuted: number;
    actionHistory: ActionLog[];
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
}
