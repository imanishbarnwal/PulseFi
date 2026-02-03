import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { SessionController } from './controllers/session';
import { YellowService } from './services/yellow';
import { AgentService } from './services/agent';
import { AgentController } from './controllers/agent';

dotenv.config();

const app = express();
import cors from 'cors';
import { validateChainConnection } from './utils/chainValidator';

app.use(cors());

// Validate Chain before starting services
const PORT = process.env.PORT || 3000;

// Async start
(async () => {
    await validateChainConnection();

    app.use(bodyParser.json());

    // Initialize Services
    const yellowService = new YellowService({
        networkUrl: process.env.YELLOW_NETWORK_URL || 'https://testnet.yellow.network',
        clearnodeUrl: process.env.CLEARNODE_URL || 'wss://clearnode.testnet.yellow.network',
        privateKey: process.env.BACKEND_PRIVATE_KEY || ''
    });

    yellowService.init();

    const sessionController = new SessionController(yellowService);

    // Routes
    // Routes
    app.post('/start-session', sessionController.startSession);
    app.post('/end-session', sessionController.endSession);
    app.get('/session/:sessionId', sessionController.getSession);

    // Extra endpoint to simulate game actions/spending
    app.post('/action', sessionController.executeAction);

    // Agent Routes
    // Agent Routes moved up

    const agentService = new AgentService();
    const agentController = new AgentController(agentService);

    app.post('/start-agent', agentController.startAgent);
    app.post('/stop-agent', agentController.stopAgent);
    app.get('/agent/:sessionId', agentController.getAgentStatus);

    app.listen(PORT, () => {
        console.log(`Yellow Session Backend running on http://localhost:${PORT}`);
        console.log('Use POST /start-session to begin.');
    });
})();
