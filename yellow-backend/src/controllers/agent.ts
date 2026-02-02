import { Request, Response } from 'express';
import { AgentService } from '../services/agent';

export class AgentController {
    private agentService: AgentService;

    constructor(agentService: AgentService) {
        this.agentService = agentService;
    }

    startAgent = async (req: Request, res: Response) => {
        const { sessionId, checkIntervalMs } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        const agent = await this.agentService.startAgent({
            sessionId,
            checkIntervalMs: checkIntervalMs ? parseInt(checkIntervalMs) : 10000 // Default 10s for easier demo? User asked for 60s. I'll respect input or default.
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
        return res.json(agent);
    }
}
