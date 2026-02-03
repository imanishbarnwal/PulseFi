import { Request, Response } from 'express';
import { SessionStore } from '../store/sessionStore';
import { YellowService } from '../services/yellow';
import { SessionState } from '../types';
import { ethers } from 'ethers';

export class SessionController {
    private yellowService: YellowService;

    constructor(yellowService: YellowService) {
        this.yellowService = yellowService;
    }

    startSession = async (req: Request, res: Response) => {
        try {
            const { walletAddress } = req.body;

            if (!walletAddress) {
                return res.status(400).json({ error: 'walletAddress is required' });
            }

            // Strict Regex Validation
            const addressRegex = /^0x[a-fA-F0-9]{40}$/;
            if (!addressRegex.test(walletAddress)) {
                console.error(`[SessionController] Rejected invalid address: ${walletAddress}`);
                return res.status(400).json({ error: 'Invalid user address. Must be a 0x-prefixed EVM address.' });
            }

            console.log(`[SessionController] Validated User: ${walletAddress} | Target Chain: Base Sepolia (84532)`);

            // 10 or 25 USDC
            const amount = 25;

            // Call Yellow SDK to start session
            const { sessionId, sessionKey } = await this.yellowService.startSession(walletAddress, amount);

            const newSession: SessionState = {
                sessionId,
                userAddress: walletAddress,
                sessionKey: sessionKey, // Stored SECURELY in backend memory only
                startTime: Date.now(),
                initialBalance: amount,
                remainingBalance: amount, // Full amount starts available
                actionsExecuted: 0,
                actionHistory: [],
                status: 'ACTIVE'
            };

            SessionStore.create(newSession);

            return res.status(200).json({
                sessionId,
                // sessionKey: NEVER RETURN TO CLIENT
                startTimestamp: newSession.startTime,
                message: 'Session started successfully. Funds locked.'
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
            settlementTxHash: session.settlementTxHash,
            canSettle: session.status === 'ACTIVE',
            // Metadata for UI
            totalActions: session.actionsExecuted,
            estimatedOnChainTxCount: 1, // Only the settlement tx
            estimatedGasSaved: session.actionsExecuted * 0.50 // Mock $0.50 per action if it were on-chain
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
                settlementTxHash: settlement.txHash
            });

            console.log(`[Session] Ended. Actions: ${session.actionsExecuted}. Final Balance: ${session.remainingBalance}`);

            const explorerUrl = `https://sepolia.basescan.org/tx/${settlement.txHash}`;

            return res.status(200).json({
                settlementTxHash: settlement.txHash,
                explorerUrl: explorerUrl,
                finalBalance: settlement.finalToUser,
                actionsExecuted: session.actionsExecuted
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
