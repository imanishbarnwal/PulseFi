import { SessionState, AgentState, AgentConfig } from '../types';
import { SessionStore } from '../store/sessionStore';
const TEST_MODE = true;

/**
 * AgentService (Simple / Deterministic)
 * 
 * Runs an automated loop for active sessions.
 * Performs deterministic OFF-CHAIN actions to demonstrate session logic.
 * NEVER signs or broadcasts on-chain transactions.
 */
export class AgentService {
    private activeAgents: Map<string, AgentState> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();

    constructor() { }

    /**
     * Starts an agent for a specific session.
     */
    async startAgent(config: AgentConfig): Promise<AgentState | null> {
        const session = SessionStore.get(config.sessionId);
        if (!session || session.status !== 'ACTIVE') {
            console.error(`[Agent] Cannot start. Session ${config.sessionId} not active.`);
            return null;
        }

        if (TEST_MODE) {
            console.log(`[Agent] TEST MODE ENABLED. Using deterministic simulation.`);
        }

        // 1. Initialize Mock State
        // We use a fixed mock price for deterministic behavior
        const mockPrice = 2500.00;

        const agentState: AgentState = {
            sessionId: config.sessionId,
            isRunning: true,
            startEthPrice: mockPrice,
            tradeCount: 0,
            totalLoss: 0,
            logs: [`Agent started. Monitoring...`]
        };

        this.activeAgents.set(config.sessionId, agentState);

        console.log(`[Agent] Started for session ${config.sessionId}`);

        // 2. Start Loop
        // Run frequently (e.g. every 5s) to feel responsive
        const intervalMs = config.checkIntervalMs || 5000;
        const timer = setInterval(() => this.runLoop(config.sessionId), intervalMs);
        this.timers.set(config.sessionId, timer);

        return agentState;
    }

    /**
     * Stops an agent.
     */
    stopAgent(sessionId: string) {
        if (this.timers.has(sessionId)) {
            clearInterval(this.timers.get(sessionId)!);
            this.timers.delete(sessionId);
        }
        const agent = this.activeAgents.get(sessionId);
        if (agent) {
            agent.isRunning = false;
            agent.logs.push('Agent stopped.');
            console.log(`[Agent] Stopped for session ${sessionId}`);
        }
    }

    /**
     * The Main Agent Loop
     * Executes deterministic logic based on time elapsed.
     */
    private async runLoop(sessionId: string) {
        const agent = this.activeAgents.get(sessionId);
        const session = SessionStore.get(sessionId);

        // Safety Checks
        if (!agent || !agent.isRunning) {
            this.stopAgent(sessionId);
            return;
        }
        if (!session || session.status !== 'ACTIVE') {
            console.log(`[Agent] Session ${sessionId} ended. Stopping agent.`);
            this.stopAgent(sessionId);
            return;
        }

        const now = Date.now();
        const timeElapsed = now - session.startTime;

        if (TEST_MODE) {
            // --- Action 1: Price Check (after ~5s) ---
            // Just a log, no state change
            if (timeElapsed > 5000 && agent.logs.length < 2) {
                const log = `[Action] Market Scan: ETH Stable at $2500. No arb opportunities.`;
                console.log(`[Agent] ${log}`);
                agent.logs.push(log);
                // Force UI update (optional, usually polled)
            }

            // --- Action 2: Mock Rebalance (after ~15s) ---
            // Updates off-chain balance (Simulated "Fee" or "Loss")
            if (timeElapsed > 15000 && agent.tradeCount === 0) {
                this.executeOffChainAction(agent, session, "Rebalance Portfolio");
            }

            // --- Action 3: No-Op / Idle (after ~25s) ---
            if (timeElapsed > 25000 && agent.logs.length < 5) {
                // Just keeping it alive
                // agent.logs.push(`[Idle] Maintaining positions...`);
            }
        }
    }

    /**
     * Executes a mock off-chain action.
     * Updates SessionStore but touches NO blockchain.
     */
    private executeOffChainAction(agent: AgentState, session: SessionState, actionName: string) {
        console.log(`[Agent] Executing ${actionName}...`);

        // 1. Calculate Mock Cost/Result
        // e.g. An automated rebalance cost 0.10 USDC in "service fees" or "slippage"
        const cost = 0.10;

        // 2. Update Session State (Off-Chain)
        // 2. Update Session State (Off-Chain)
        const newBalance = session.remainingBalance - cost;
        const newActionLog = {
            id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            type: actionName.toUpperCase().includes('SCAN') ? 'MARKET_SCAN' : 'REBALANCE',
            description: actionName,
            cost: cost,
            timestamp: Date.now()
        };

        const currentHistory = session.actionHistory || [];

        SessionStore.update(session.sessionId, {
            remainingBalance: newBalance,
            actionsExecuted: session.actionsExecuted + 1,
            actionHistory: [...currentHistory, newActionLog]
        });

        // 3. Update Agent State
        agent.tradeCount++;
        agent.totalLoss += cost;

        const log = `[Action] ${actionName} executed. Cost: ${cost} USDC. New Balance: ${newBalance.toFixed(2)}`;
        agent.logs.push(log);
        console.log(`[Agent] ${log}`);
    }

    getAgent(sessionId: string) {
        return this.activeAgents.get(sessionId);
    }
}
