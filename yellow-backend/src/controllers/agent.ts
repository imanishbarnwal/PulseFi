import { Request, Response } from 'express';
import { AgentService } from '../services/agent';

export class AgentController {
    private agentService: AgentService;

    constructor(agentService: AgentService) {
        this.agentService = agentService;
    }

    startAgent = async (req: Request, res: Response) => {
        const { sessionId, checkIntervalMs, mode, isDemo } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        const agent = await this.agentService.startAgent({
            sessionId,
            checkIntervalMs: checkIntervalMs ? parseInt(checkIntervalMs) : 10000,
            mode: mode || 'REBALANCE', // Default to Rebalance if not specified
            isDemo: isDemo === true || isDemo === 'true'
        });

        if (!agent) {
            return res.status(400).json({ error: 'Failed to start agent. Session might be inactive.' });
        }

        return res.json({ message: 'Agent started', agentState: agent });
    };

    stopAgent = async (req: Request, res: Response) => {
        const { sessionId } = req.body;
        this.agentService.stopAgent(sessionId);
        return res.json({ message: 'Agent stop signal sent' });
    };

    getAgentStatus = async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const agent = this.agentService.getAgent(sessionId);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        // Include session remaining balance
        const { SessionStore } = require('../store/sessionStore');
        const session = SessionStore.get(sessionId);

        return res.json({
            ...agent,
            remainingBalance: session?.remainingBalance || 0,
            escrowBalance: session?.escrowBalance || 0
        });
    }

    forceTrade = async (req: Request, res: Response) => {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        try {
            const result = await this.agentService.forceTrade(sessionId);
            return res.json({ success: true, result });
        } catch (error: any) {
            console.error('[AgentController] Force trade failed:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
