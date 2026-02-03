import { Request, Response } from 'express';
import { SessionStore } from '../store/sessionStore';
import { YellowService } from '../services/yellow';
import { SessionState, AgentStrategy } from '../types';
import { ethers } from 'ethers';

export class SessionController {
    private yellowService: YellowService;

    constructor(yellowService: YellowService) {
        this.yellowService = yellowService;
    }

    getEscrowAddress = async (req: Request, res: Response) => {
        const privateKey = process.env.ESCROW_PRIVATE_KEY;
        if (!privateKey) {
            console.error('[SessionController] ESCROW_PRIVATE_KEY is missing');
            return res.status(500).json({ error: 'Escrow private key is not configured' });
        }

        try {
            const wallet = new ethers.Wallet(privateKey);
            return res.json({ address: wallet.address });
        } catch (error: any) {
            console.error('[SessionController] Invalid ESCROW_PRIVATE_KEY:', error.message);
            return res.status(500).json({ error: 'Invalid escrow configuration' });
        }
    };

    startSession = async (req: Request, res: Response) => {
        try {
            const { walletAddress, strategy } = req.body;

            if (!walletAddress) {
                return res.status(400).json({ error: 'walletAddress is required' });
            }

            // Strategy Validation (Default to ACTIVE_REBALANCE)
            const allowedStrategies: AgentStrategy[] = ['ACTIVE_REBALANCE', 'HIGH_FREQ_SCAN', 'IDLE_LOG_ONLY'];
            const selectedStrategy: AgentStrategy = allowedStrategies.includes(strategy)
                ? strategy
                : 'ACTIVE_REBALANCE';

            // Strict Regex Validation
            const addressRegex = /^0x[a-fA-F0-9]{40}$/;
            if (!addressRegex.test(walletAddress)) {
                console.error(`[SessionController] Rejected invalid address: ${walletAddress}`);
                return res.status(400).json({ error: 'Invalid user address. Must be a 0x-prefixed EVM address.' });
            }

            console.log(`[SessionController] User: ${walletAddress} | Strategy: ${selectedStrategy} | Chain: Base Sepolia`);

            // 10 or 25 USDC
            const amount = req.body.amount || 25;

            // Verify USDC Allowance
            const isApproved = await this.yellowService.verifyAllowance(walletAddress, amount);
            if (!isApproved) {
                console.warn(`[SessionController] Rejected session for ${walletAddress}: Insufficient USDC allowance.`);
                return res.status(400).json({
                    error: 'Insufficient USDC allowance. Please approve the escrow address first.',
                    escrowAddress: this.yellowService.getWalletAddress()
                });
            }

            // Call Yellow SDK to start session
            const { sessionId, sessionKey, txHash } = await this.yellowService.startSession(walletAddress, amount);

            const newSession: SessionState = {
                sessionId,
                userAddress: walletAddress,
                sessionKey: sessionKey, // Stored SECURELY in backend memory only
                startTime: Date.now(),
                initialBalance: amount,
                remainingBalance: amount,
                escrowBalance: amount,
                actionsExecuted: 0,
                actionHistory: [],
                decisions: [],
                strategy: selectedStrategy,
                status: 'ACTIVE'
            };

            SessionStore.create(newSession);

            return res.status(200).json({
                sessionId,
                // sessionKey: NEVER RETURN TO CLIENT
                startTimestamp: newSession.startTime,
                txHash,
                message: 'Session started successfully. Funds locked on-chain.'
            });
        } catch (error: any) {
            console.error('Error starting session:', error);
            return res.status(500).json({ error: error.message });
        }
    };

    getSession = async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const session = SessionStore.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Return public session data
        return res.json({
            sessionId: session.sessionId,
            userAddress: session.userAddress,
            status: session.status,
            startTime: session.startTime,
            remainingBalance: session.remainingBalance,
            actionsExecuted: session.actionsExecuted,
            actionHistory: session.actionHistory,
            decisions: session.decisions,
            settlementTxHash: session.settlementTxHash,
            canSettle: session.status === 'ACTIVE',
            // Metadata for UI
            totalActions: session.actionsExecuted,
            estimatedOnChainTxCount: 1, // Only the settlement tx
            estimatedGasSaved: session.actionsExecuted * 0.50 // Mock $0.50 per action if it were on-chain
        });
    }

    getDecisions = async (req: Request, res: Response) => {
        const sessionId = (req.query.sessionId as string) || req.params.sessionId;
        const limit = 10; // Forced limit by user request

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        const session = SessionStore.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const decisions = (session.decisions || []).slice(-limit);

        return res.json({
            sessionId: session.sessionId,
            decisions
        });
    }

    getSummary = async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const session = SessionStore.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        return res.json({
            sessionId: session.sessionId,
            strategy: session.strategy || 'ACTIVE_REBALANCE',
            actionsExecuted: session.actionsExecuted,
            decisionsCount: session.decisions?.length || 0,
            finalBalance: session.status === 'SETTLED' ? session.remainingBalance : undefined
        });
    }

    endSession = async (req: Request, res: Response) => {
        try {
            const { sessionId } = req.body;

            if (!sessionId) {
                return res.status(400).json({ error: 'sessionId is required' });
            }

            const session = SessionStore.get(sessionId);

            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            if (session.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Session is already reached final state' });
            }

            console.log(`[SessionController] Initiating Settlement Sequence for ${sessionId}`);

            // Settle on chain
            const settlement = await this.yellowService.settleSession(session);

            // Update store
            SessionStore.update(sessionId, {
                status: 'SETTLED',
                settlementTxHash: settlement.settlementTxHash
            });

            console.log(`[Session] Ended. Actions: ${session.actionsExecuted}. Final Balance: ${session.remainingBalance}`);

            const explorerUrl = `https://sepolia.basescan.org/tx/${settlement.settlementTxHash}`;

            return res.status(200).json({
                settlementTxHash: settlement.settlementTxHash,
                explorerUrl: explorerUrl,
                finalBalance: settlement.finalBalance,
                actionsExecuted: session.actionsExecuted,
                totalTrades: settlement.totalTrades,
                gasSpentUSD: settlement.gasSpentUSD,
                gasSavedUSD: settlement.gasSavedUSD
            });

        } catch (error: any) {
            console.error('Error ending session:', error);
            return res.status(500).json({ error: error.message });
        }
    };

    /**
     * Helper to simulate spending/actions for testing
     */
    executeAction = async (req: Request, res: Response) => {
        const { sessionId, actionCost } = req.body;
        const session = SessionStore.get(sessionId);

        if (!session || session.status !== 'ACTIVE') {
            return res.status(404).json({ error: 'Active session not found' });
        }

        if (session.remainingBalance < actionCost) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Update state in memory
        const newBalance = session.remainingBalance - actionCost;
        SessionStore.update(sessionId, {
            remainingBalance: newBalance,
            actionsExecuted: session.actionsExecuted + 1
        });

        console.log(`[Action] Executed for session ${sessionId}. New Balance: ${newBalance}`);

        return res.json({ success: true, remainingBalance: newBalance });
    }
}
