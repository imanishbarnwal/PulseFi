import { ActionLog, AgentConfig, AgentState, SessionState } from '../types';
import { SessionStore } from '../store/sessionStore';
import { LifiService } from './lifi';
import { simulateSwap, executeTrade } from './uniswap';
import { ethers } from 'ethers';

import { YellowService } from './yellow';

const TEST_MODE = true;

/**
 * AgentService (Simple / Deterministic)
 */
export class AgentService {
    private activeAgents: Map<string, AgentState> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();

    private lifiService: LifiService;
    private yellowService: YellowService;

    constructor(yellowService: YellowService) {
        this.lifiService = new LifiService();
        this.yellowService = yellowService;
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
            logs: [config.isDemo ? `[DEMO MODE] Agent started. Fast-polling active.` : `Agent started. Monitoring...`],
            mode: config.mode,
            isDemo: config.isDemo
        };

        this.activeAgents.set(config.sessionId, agentState);

        console.log(`[Agent] Started for session ${config.sessionId}`);

        // 2. Start Loop
        // Run frequently (e.g. every 5s) to feel responsive. Demo mode is even faster.
        const intervalMs = config.isDemo ? 1500 : (config.checkIntervalMs || 5000);
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
            const strategy = session.strategy || 'ACTIVE_REBALANCE';

            // Strategy Logic
            switch (strategy) {
                case 'HIGH_FREQ_SCAN':
                    // Continuous High Freq Scanning
                    const scanLog = `[Action] High-Freq Market Scan: ETH Volatility Check.`;
                    console.log(`[Agent] ${scanLog}`);
                    agent.logs.push(scanLog);

                    SessionStore.addDecision(sessionId, {
                        timestamp: Date.now(),
                        decisionType: 'MARKET_SCAN',
                        reasoning: ["High frequency scan interval", "Aggressive monitoring"],
                        confidence: 0.60,
                        impactEstimate: "Data gathering only"
                    });
                    break;

                case 'IDLE_LOG_ONLY':
                    if (agent.logs.length < 5) { // Limit idle logs
                        agent.logs.push(`[Idle] Monitoring market...`);

                        SessionStore.addDecision(sessionId, {
                            timestamp: Date.now(),
                            decisionType: 'NO_OP',
                            reasoning: ["Agent is in IDLE mode", "Preserving battery/credits"],
                            confidence: 1.0,
                            impactEstimate: "None"
                        });
                    }
                    break;

                case 'ACTIVE_REBALANCE':
                default:
                    // Original flow: Scan once, then Rebalance once
                    if (timeElapsed > 5000 && agent.logs.length < 2) {
                        const log = `[Action] Market Scan: ETH Stable at $2500. No arb opportunities.`;
                        console.log(`[Agent] ${log}`);
                        agent.logs.push(log);

                        SessionStore.addDecision(sessionId, {
                            timestamp: Date.now(),
                            decisionType: 'MARKET_SCAN',
                            reasoning: ["Initial safety check", "Market volatility low"],
                            confidence: 0.9,
                            impactEstimate: "Safe to proceed"
                        });
                    }

                    const rebalanceThreshold = agent.isDemo ? 3000 : 15000;
                    if (timeElapsed > rebalanceThreshold && agent.tradeCount === 0) {
                        this.executeOffChainAction(agent, session, "Rebalance Portfolio");
                    }
                    break;
            }
        }
    }

    /**
     * Executes a mock off-chain action.
     * Updates SessionStore but touches NO blockchain.
     */
    private async executeOffChainAction(agent: AgentState, session: SessionState, actionName: string) {
        console.log(`[Agent] Executing ${actionName}...`);

        let description = actionName;
        let cost = 0.10; // Base "Gas" cost for the decision

        let storedSession = SessionStore.get(session.sessionId) || session;
        let decisionType: any = 'EXECUTION';
        let reasoning = ["Executing standard action"];
        let confidence = 0.85;
        let impact = "Portfolio adjustment";
        let lifiRoute: any = null;
        let uniSim: any = null;

        // 1. Market Analysis (Scan & Rebalance)
        if (actionName.includes('Rebalance') || actionName.includes('Scan')) {
            console.log(`[Agent] Comparing venues (LiFi vs Uniswap V3)...`);

            // 1. Get LiFi Quote (Direct Route)
            lifiRoute = await this.lifiService.getBestRoute({
                fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
                toToken: '0x4200000000000000000000000000000000000006',   // WETH
                amount: '10000000', // 10 USDC
                chainId: 8453
            });

            // 2. Get Uniswap Simulation (Via Quoter)
            uniSim = await simulateSwap({
                tokenIn: 'USDC',
                tokenOut: 'WETH',
                amountIn: '10000000'
            });

            const liFiOut = lifiRoute ? parseFloat(lifiRoute.minAmountOut) : 0;
            const uniOut = uniSim ? parseFloat(uniSim.estimatedAmountOut) : 0;

            const lifiGas = lifiRoute ? parseFloat(lifiRoute.estimatedGas) : 0.65;
            const uniGas = parseFloat(uniSim?.estimatedGas || "0.45");

            let winner = 'Uniswap';
            let reason = '';

            // Direct Comparison
            const outDiff = liFiOut - uniOut;
            const percentBetter = uniOut > 0 ? (outDiff / uniOut) * 100 : 0;

            if (percentBetter > 0.05) {
                winner = 'LiFi';
                reason = `Route Comparison: LiFi output is ${percentBetter.toFixed(3)}% better than Uniswap Quoter.`;
            } else if (uniGas < lifiGas) {
                winner = 'Uniswap';
                reason = `Route Comparison: Uniswap gas ($${uniGas}) is cheaper than LiFi ($${lifiGas.toFixed(2)}).`;
            } else {
                winner = 'LiFi';
                reason = `Route Comparison: LiFi selected as most efficient route.`;
            }

            const profit = outDiff; // Just for the impact check below

            // Decision Logic: Execute only if improvement is meaningful AND no prior trade
            const EXECUTION_THRESHOLD = 0.1; // 0.1% better
            const hasExistingTrade = (storedSession.actionHistory || []).some(a => a.type === 'REBALANCE');

            if (percentBetter > EXECUTION_THRESHOLD && !hasExistingTrade) {
                // TRADE_OPPORTUNITY_FOUND
                decisionType = 'EXECUTION';
                description = `Arb Found: ${reason}`;

                reasoning = [
                    `Market Scan: USDC -> WETH`,
                    `Venue Selection: ${winner}`,
                    `Advantage: ${reason}`,
                    `Msg: TRADE_OPPORTUNITY_FOUND`,
                    ...(agent.isDemo ? ["[DEMO MODE] Forcing profitable route"] : [])
                ];
                confidence = 0.95;
                impact = `${agent.isDemo ? '[DEMO] ' : ''}Target: ${winner}. Advantage: ${percentBetter.toFixed(4)}%`;

                // EXECUTE TRADE
                const network = new ethers.Network('base-sepolia', 84532);
                const provider = new ethers.JsonRpcProvider('https://sepolia.base.org', network);
                const signer = this.yellowService.getSigner(provider);

                await executeTrade(session, {
                    tool: winner,
                    route: {
                        ...(winner === 'LiFi' ? lifiRoute : { id: 'uni-v3-sim' }),
                        amountOut: winner === 'LiFi'
                            ? (parseFloat(lifiRoute.minAmountOut) / 1e18).toFixed(6)
                            : (parseFloat(uniSim.estimatedAmountOut) / 1e18).toFixed(6)
                    },
                    estimatedGas: (winner === 'LiFi' ? lifiGas : uniGas).toString()
                }, signer);
            } else {
                // NO_PROFITABLE_ROUTE
                decisionType = 'ROUTE_CHECK';
                description = "Market Stable - Monitoring";

                reasoning = [
                    `Market Check: Improvement ${percentBetter.toFixed(3)}% < Threshold`,
                    `No profitable route found > gas cost`,
                    `Msg: NO_PROFITABLE_ROUTE`
                ];
                confidence = 0.98;
                impact = "Gas Saved: $0.00 (No Tx)";
            }

            console.log(`[Agent] Decision Made: ${description}`);
        }

        // 2. Update Session State (Off-Chain Decision Log)
        const currentBalance = storedSession.remainingBalance - cost;
        const newActionLog: ActionLog = {
            id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            type: actionName.toUpperCase().includes('SCAN') ? 'MARKET_SCAN' : 'REBALANCE',
            description: description,
            cost: cost,
            timestamp: Date.now()
        };

        SessionStore.update(session.sessionId, {
            remainingBalance: currentBalance,
            actionsExecuted: storedSession.actionsExecuted + 1,
            actionHistory: [...(storedSession.actionHistory || []), newActionLog]
        });

        // Log Structured Decision
        SessionStore.addDecision(session.sessionId, {
            timestamp: Date.now(),
            decisionType: decisionType,
            reasoning: reasoning,
            confidence: confidence,
            impactEstimate: impact,
            data: {
                lifi: {
                    out: lifiRoute ? parseFloat(lifiRoute.minAmountOut).toFixed(6) : "0",
                    gas: lifiRoute ? parseFloat(lifiRoute.estimatedGas).toFixed(2) : "0.65"
                },
                uniswap: {
                    out: uniSim ? parseFloat(uniSim.estimatedAmountOut).toFixed(6) : "0",
                    gas: "0.45"
                }
            }
        });

        // 3. Update Agent State
        agent.tradeCount++;
        agent.totalLoss += cost;

        const log = `[Action] ${description}. Cost: ${cost} USDC. New Balance: ${currentBalance.toFixed(2)}`;
        agent.logs.push(log);
        console.log(`[Agent] ${log}`);
    }

    async forceTrade(sessionId: string) {
        const agent = this.activeAgents.get(sessionId);
        const session = SessionStore.get(sessionId);

        if (!agent || !session || session.status !== 'ACTIVE') {
            throw new Error('Agent or Session not active');
        }

        console.log(`[Agent] FORCING DEMO TRADE for session ${sessionId}...`);

        const mockProfit = 0.5; // 0.5% profitable route
        const winner = 'Uniswap';
        const reason = 'Manual Demo Execution: Arbitrary profitable route found.';

        // Create forced decision parameters
        const reasoning = [
            `Manual Force Triggered`,
            `Venue Selection: ${winner}`,
            `Advantage: +${mockProfit}% forced by User`,
            `Msg: MANUAL_DEMO_EXECUTION`
        ];
        const confidence = 1.0;
        const impact = `[DEMO] Target: ${winner}. Advantage: ${mockProfit.toFixed(4)}%`;

        const uniGas = 0.45;

        // EXECUTE TRADE
        const network = new ethers.Network('base-sepolia', 84532);
        const provider = new ethers.JsonRpcProvider('https://sepolia.base.org', network);
        const signer = this.yellowService.getSigner(provider);

        // We use mock route data for the trade execution
        const routeData = {
            id: 'demo-force-swap',
            amountOut: '0.000450', // Mock output for 1 USDC
            priceImpact: '0.01'
        };

        const result = await executeTrade(session, {
            tool: winner,
            route: routeData,
            estimatedGas: uniGas.toString()
        }, signer);

        if (result?.status === 'SUCCESS') {
            // Log structured decision so it shows up in UI
            SessionStore.addDecision(sessionId, {
                timestamp: Date.now(),
                decisionType: 'EXECUTION',
                reasoning: reasoning,
                confidence: confidence,
                impactEstimate: impact,
                data: {
                    lifi: { out: "0", gas: "0.65" },
                    uniswap: { out: routeData.amountOut, gas: "0.45" }
                }
            });

            agent.logs.push(`[Manual] Forced Demo Trade Executed via Uniswap. Tx: ${result.txHash.slice(0, 10)}...`);
            agent.tradeCount++;
        }

        return result;
    }

    getAgent(sessionId: string) {
        return this.activeAgents.get(sessionId);
    }
}
