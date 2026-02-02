import { SessionState, AgentState, AgentConfig } from '../types';
import { SessionStore } from '../store/sessionStore';
import { PriceService } from './price';

export class AgentService {
    private activeAgents: Map<string, AgentState> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private priceService: PriceService;

    constructor() {
        this.priceService = new PriceService();
    }

    /**
     * Starts an agent for a specific session.
     */
    async startAgent(config: AgentConfig): Promise<AgentState | null> {
        const session = SessionStore.get(config.sessionId);
        if (!session || session.status !== 'ACTIVE') {
            console.error(`[Agent] Cannot start. Session ${config.sessionId} not active.`);
            return null;
        }

        // 1. Get Initial Price
        const initialPrice = await this.priceService.getEthPrice();
        console.log(`[Agent] Starting for session ${config.sessionId}. Baseline ETH Price: $${initialPrice}`);

        // 2. Initialize State
        const agentState: AgentState = {
            sessionId: config.sessionId,
            isRunning: true,
            startEthPrice: initialPrice,
            tradeCount: 0,
            totalLoss: 0,
            logs: [`Agent started. Baseline Price: $${initialPrice}`]
        };

        this.activeAgents.set(config.sessionId, agentState);

        // 3. Start Loop
        const intervalMs = config.checkIntervalMs || 60000;
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

        // 1. Monitor Price
        const currentPrice = await this.priceService.getEthPrice();
        // Update price in logs every now and then? Or just keep it silent until action.
        // console.log(`[Agent Loop] Session ${sessionId.slice(0, 6)} | ETH: $${currentPrice.toFixed(2)}`);

        // 2. Logic: One Swap Logic (Wait 60s, then Trade)
        const now = Date.now();
        const timeElapsed = now - session.startTime;

        // Requirement: "After session start, wait 60 seconds." & "Execute ONE real Uniswap v4 swap."
        if (agent.tradeCount === 0 && timeElapsed > 60000) {
            console.log(`[Agent] 60 seconds elapsed. Attempting single Uniswap Swap...`);
            await this.executeRealSwap(agent, session, currentPrice);
        }
    }

    /**
     * Executes ONE Real Uniswap Swap
     */
    private async executeRealSwap(agent: AgentState, session: SessionState, currentPrice: number) {
        try {
            // Import dynamically or assume it is available
            const { swapOnUniswap } = await import('./uniswap');
            const { ethers } = await import('ethers');

            // Setup Provider (Base Sepolia)
            const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');

            // Create Signer from Session Key
            const signer = new ethers.Wallet(session.sessionKey, provider);

            // Amount: 2 USDC (approx). 
            // In a real pair, input is ETH or USDC. Let's assume we are selling ETH for 2 USDC?
            // Or selling 2 USDC worth of ETH? 
            // The prompt says "Execute a small swap (exactly 2 USDC worth)".
            // Let's swap ETH -> USDC. 2 USDC is approx 0.0008 ETH (at $2500).
            const amountInETH = (2 / currentPrice).toFixed(6);
            const amountInWei = ethers.parseEther(amountInETH);

            agent.logs.push(`Attempting Uniswap V4 Swap: ${amountInETH} ETH -> USDC...`);

            // Execute
            const result = await swapOnUniswap({
                inputToken: 'ETH',
                outputToken: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC (Example)
                amountIn: amountInWei,
                signer: signer
            });

            // Update State
            const cost = 2.0; // We define it as 2 USDC worth
            const newBalance = session.remainingBalance - cost;

            SessionStore.update(session.sessionId, {
                remainingBalance: newBalance,
                actionsExecuted: session.actionsExecuted + 1
            });

            agent.tradeCount++;
            agent.totalLoss += 0.05; // Gas fee approx

            const successLog = `SUCCESS: Swap 2 USDC worth (${amountInETH} ETH). Tx: ${result.txHash}`;
            console.log(`[Agent] ${successLog}`);
            agent.logs.push(successLog);

            // --- CHAIN EVENT: Trigger LI.FI Bridge ---
            const { LifiService } = await import('./lifi');
            const lifi = new LifiService();

            agent.logs.push(`[Agent] Triggering LI.FI Bridge (1 USDC Base Sepolia -> Sepolia)...`);

            // 84532 (Base Sepolia) -> 11155111 (Sepolia)
            // 1 USDC = 1000000 (6 decimals)
            const bridgeResult = await lifi.bridgeUsdc(
                signer,
                84532,
                11155111,
                "1000000"
            );

            if (bridgeResult.status === 'SUCCESS') {
                const log = `SUCCESS: Bridged 1 USDC. Route: ${bridgeResult.routeId}. Tx: ${bridgeResult.txHash}`;
                console.log(`[Agent] ${log}`);
                agent.logs.push(log);
            } else {
                agent.logs.push(`FAILED: LI.FI bridge attempt.`);
            }



        } catch (error: any) {
            console.error(`[Agent] Swap Failed: ${error.message}`);
            agent.logs.push(`FAILED: Swap error - ${error.message}`);
            // We increment tradeCount to prevent infinite retries of the same failure
            agent.tradeCount++;
        }
    }

    getAgent(sessionId: string) {
        return this.activeAgents.get(sessionId);
    }
}
