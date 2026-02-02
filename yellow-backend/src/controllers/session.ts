import { Request, Response } from 'express';
import { SessionStore } from '../store/sessionStore';
import { YellowService } from '../services/yellow';
import { SessionState } from '../types';

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

            // 10 or 25 USDC
            const amount = 25;

            // Call Yellow SDK to start session
            const { sessionId, sessionKey } = await this.yellowService.startSession(walletAddress, amount);

            const newSession: SessionState = {
                sessionId,
                userAddress: walletAddress,
                sessionKey: sessionKey, // Returning private key to user/client for signing
                startTime: Date.now(),
                initialBalance: amount,
                remainingBalance: amount, // Full amount starts available
                actionsExecuted: 0,
                status: 'ACTIVE'
            };

            SessionStore.create(newSession);

            return res.status(200).json({
                sessionId,
                sessionKey,
                startTimestamp: newSession.startTime,
                message: 'Session started successfully. Funds locked.'
            });
        } catch (error: any) {
            console.error('Error starting session:', error);
            return res.status(500).json({ error: error.message });
        }
    };

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

            // Settle on chain
            const settlement = await this.yellowService.settleSession(session);

            // Update store
            SessionStore.update(sessionId, {
                status: 'SETTLED',
                settlementTxHash: settlement.txHash
            });

            console.log(`[Session] Ended. Actions: ${session.actionsExecuted}. Final Balance: ${session.remainingBalance}`);

            return res.status(200).json({
                settlementTxHash: settlement.txHash,
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
