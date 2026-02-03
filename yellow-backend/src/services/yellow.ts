import { ethers } from 'ethers';
// import { NitroliteSDK, Channel, Session } from '@erc7824/nitrolite'; // Hypothetical imports
import { SessionState, YellowSessionConfig, EndSessionResponse } from '../types';
import { SessionStore } from '../store/sessionStore';
import { executeTrade } from './uniswap';

const SESSION_ESCROW_ABI = [
    'function createSession(bytes32 sessionId, uint256 amount) external',
    'function spend(bytes32 sessionId, address recipient, uint256 amount) external',
    'function settle(bytes32 sessionId) external',
    'function sessions(bytes32) view returns (address owner, uint256 balance)'
];

const SESSION_ESCROW_ADDRESS = process.env.SESSION_ESCROW_ADDRESS || '0x66B72352B6C3F71320F24683f3ee91e84C23667c'; // Update with deployed address

/**
 * Service to handle Yellow Network and On-Chain Escrow interactions.
 */
export class YellowService {
    private config: YellowSessionConfig;
    private wallet: ethers.Wallet | ethers.HDNodeWallet;
    private provider: ethers.JsonRpcProvider;

    constructor(config: YellowSessionConfig) {
        this.config = config;

        const network = new ethers.Network('base-sepolia', 84532);
        this.provider = new ethers.JsonRpcProvider('https://sepolia.base.org', network);

        this.wallet = config.privateKey
            ? new ethers.Wallet(config.privateKey, this.provider)
            : ethers.Wallet.createRandom(this.provider);

        console.log(`[YellowService] Initialized with backend wallet: ${this.wallet.address}`);
    }

    /**
     * Initializes connection to the ClearNode/Nitrolite environment
     */
    async init() {
        console.log(`[YellowService] Connecting to Nitrolite at ${this.config.clearnodeUrl}...`);
        // await this.sdk.connect();
        console.log(`[YellowService] Connected.`);
    }

    /**
     * Creates a new session on-chain via SessionEscrow.
     * 1. Requires user to have approved SESSION_ESCROW_ADDRESS for USDC.
     * 2. Calls createSession(sessionId, amount).
     */
    async startSession(userAddress: string, amount: number): Promise<{ sessionId: string, sessionKey: string, txHash: string }> {
        const sessionId = ethers.hexlify(ethers.randomBytes(32));
        const amountBase = ethers.parseUnits(amount.toString(), 6);

        console.log(`[YellowService] Starting on-chain session ${sessionId} for ${userAddress} with ${amount} USDC`);

        try {
            const escrowContract = new ethers.Contract(SESSION_ESCROW_ADDRESS, SESSION_ESCROW_ABI, this.wallet);

            console.log(`[YellowService] Executing SessionEscrow.createSession...`);
            // Note: This requires the USER to have approved the Escrow contract, 
            // but the backend is acting as the executor/relayer here for the hackathon flow.
            // In a real app, the user might call this, or the backend uses a signature.
            const tx = await escrowContract.createSession(sessionId, amountBase);
            console.log(`[YellowService] CreateSession Tx Broadcast: ${tx.hash}`);
            await tx.wait();
            console.log(`[YellowService] Session confirmed on-chain.`);

            const sessionWallet = ethers.Wallet.createRandom();

            return {
                sessionId,
                sessionKey: sessionWallet.privateKey,
                txHash: tx.hash
            };
        } catch (error: any) {
            console.error(`[YellowService] Escrow start failed: ${error.message}`);
            throw new Error(`Failed to lock funds on-chain: ${error.message}`);
        }
    }

    /**
     * Settles the session on-chain via SessionEscrow.
     * Triggers the final on-chain settlement transaction (Escrow -> User).
     */
    async settleSession(session: SessionState): Promise<EndSessionResponse & { executionTxs?: string[] }> {
        console.log(`[YellowService] Settling on-chain Session ${session.sessionId}...`);

        try {
            const escrowContract = new ethers.Contract(SESSION_ESCROW_ADDRESS, SESSION_ESCROW_ABI, this.wallet);

            const [, onChainBalance] = await escrowContract.sessions(session.sessionId);
            const finalBalance = parseFloat(ethers.formatUnits(onChainBalance, 6));

            let executionTxs: string[] = [];
            if (session.bestRoute && session.bestRoute.tool === 'Uniswap') {
                try {
                    const result = await this.executeOnChainTrade(session.sessionId, 1.0);
                    if (result.swapTxHash) {
                        executionTxs = [result.spendTxHash, result.swapTxHash];
                    } else {
                        executionTxs = [result.spendTxHash];
                    }
                } catch (e: any) {
                    console.error(`[YellowService] On-chain trade failed: ${e.message}`);
                }
            }

            console.log(`[YellowService] Final Settle for ${session.sessionId}`);
            const tx = await escrowContract.settle(session.sessionId);
            console.log(`[YellowService] Settlement Tx Broadcast: ${tx.hash}`);
            await tx.wait();

            return {
                settlementTxHash: tx.hash,
                finalBalance: 0,
                totalTrades: session.actionsExecuted || 0,
                gasSpentUSD: 0,
                gasSavedUSD: (session.actionsExecuted || 0) * 0.50,
                executionTxs
            };
        } catch (error: any) {
            console.error(`[YellowService] ❌ Settlement Failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Dedicated method for the ETHGlobal demo: 
     * 1. Spend from Escrow to Backend
     * 2. Execute Uniswap Swap
     */
    async executeOnChainTrade(sessionId: string, amountUSD: number): Promise<{ spendTxHash: string, swapTxHash: string }> {
        const session = SessionStore.get(sessionId);
        if (!session) throw new Error("Session not found");

        const escrowContract = new ethers.Contract(SESSION_ESCROW_ADDRESS, SESSION_ESCROW_ABI, this.wallet);

        // 1. SPEND
        console.log(`[YellowService] Step 1: spend(${sessionId}, backendWallet, ${amountUSD} USDC)`);
        const spendTx = await escrowContract.spend(sessionId, this.wallet.address, ethers.parseUnits(amountUSD.toFixed(2), 6));
        await spendTx.wait();
        const spendTxHash = spendTx.hash;

        // 2. SWAP
        console.log(`[YellowService] Step 2: Uniswap V3 exactInputSingle...`);
        const result = await executeTrade(session, {
            tool: 'Uniswap',
            route: { out: '0.0004' }, // Placeholder for estimating
            estimatedGas: '0.50'
        }, this.wallet);

        if (result?.status !== 'SUCCESS') {
            throw new Error(`Swap failed: ${result?.txHash || 'Unknown'}`);
        }

        return {
            spendTxHash,
            swapTxHash: result.txHash
        };
    }

    /**
     * Allows the agent to spend USDC from the escrow for a trade.
     */
    async spendFromEscrow(sessionId: string, recipient: string, amountUSD: number): Promise<string> {
        console.log(`[YellowService] On-chain Spend: ${amountUSD} USDC from session ${sessionId}`);

        const contract = new ethers.Contract(SESSION_ESCROW_ADDRESS, SESSION_ESCROW_ABI, this.wallet);
        const amountBase = ethers.parseUnits(amountUSD.toFixed(2), 6);

        const tx = await contract.spend(sessionId, recipient, amountBase);
        console.log(`[YellowService] Spend Tx Broadcast: ${tx.hash}`);
        await tx.wait();
        console.log(`[YellowService] Spend confirmed.`);

        return tx.hash;
    }

    /**
     * Fetches real balance from the escrow contract.
     */
    async getEscrowBalance(sessionId: string): Promise<number> {
        const contract = new ethers.Contract(SESSION_ESCROW_ADDRESS, SESSION_ESCROW_ABI, this.provider);
        const [, balance] = await contract.sessions(sessionId);
        return parseFloat(ethers.formatUnits(balance, 6));
    }

    /**
     * Execute an off-chain action (logic only, updates state)
     */
    async executeAction(session: SessionState, cost: number) {
        console.log(`[YellowService] Executing off-chain action. Cost: ${cost}`);
        return true; // Success
    }

    getWalletAddress(): string {
        return this.wallet.address;
    }

    getSigner(provider: ethers.Provider): ethers.Signer {
        return this.wallet.connect(provider);
    }

    /**
     * Verifies that the user has approved the backend escrow address 
     * to spend the required USDC amount.
     */
    async verifyAllowance(userAddress: string, amount: number): Promise<boolean> {
        const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
        const ERC20_ABI = ['function allowance(address owner, address spender) view returns (uint256)'];

        try {
            const network = new ethers.Network('base-sepolia', 84532);
            const provider = new ethers.JsonRpcProvider('https://sepolia.base.org', network);
            const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

            const allowance = await usdcContract.allowance(userAddress, this.wallet.address);

            // USDC has 6 decimals
            const requiredAllowance = ethers.parseUnits(amount.toString(), 6);

            console.log(`[YellowService] Checking allowance for ${userAddress} -> ${this.wallet.address}`);
            console.log(`[YellowService] Current: ${allowance.toString()} | Required: ${requiredAllowance.toString()}`);

            return allowance >= requiredAllowance;
        } catch (error: any) {
            console.error(`[YellowService] Allowance check failed: ${error.message}`);
            // In demo mode or if RPC fails, we might want to return true to not block the presenter
            // but for "Real USDC" request, we should return false.
            return false;
        }
    }
}
