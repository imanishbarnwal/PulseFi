import { ethers } from 'ethers';
// import { NitroliteSDK, Channel, Session } from '@erc7824/nitrolite'; // Hypothetical imports
import { SessionState, YellowSessionConfig, EndSessionResponse } from '../types';
import { SessionStore } from '../store/sessionStore';

/**
 * Service to handle Yellow Network interactions.
 * 
 * Note: Since specific API signatures for @erc7824/nitrolite 
 * depend on the exact version and are not browsable, 
 * this service mocks the *logic* flow using best practices for State Channels.
 */
export class YellowService {
    private config: YellowSessionConfig;
    private wallet: ethers.Wallet | ethers.HDNodeWallet;

    // Mock SDK instance
    private sdk: any;

    constructor(config: YellowSessionConfig) {
        this.config = config;
        // Initialize backend wallet (counterparty for the session)
        // ensure PRIVATE_KEY is set in .env
        this.wallet = config.privateKey
            ? new ethers.Wallet(config.privateKey)
            : ethers.Wallet.createRandom();

        console.log(`[YellowService] Initialized with backend wallet: ${this.wallet.address}`);

        // this.sdk = new NitroliteSDK({ ... });
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
     * Creates a new session on the Yellow Network.
     * 1. Performs on-chain transferFrom(user -> escrow) for USDC.
     * 2. Generates ephemeral session Key.
     */
    async startSession(userAddress: string, amount: number): Promise<{ sessionId: string, sessionKey: string }> {
        const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
        const ERC20_ABI = [
            'function transferFrom(address from, address to, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)'
        ];

        console.log(`[YellowService] Starting session escrow for ${userAddress} with ${amount} USDC`);

        try {
            const network = new ethers.Network('base-sepolia', 84532);
            const provider = new ethers.JsonRpcProvider('https://sepolia.base.org', network);
            const backendSigner = this.wallet.connect(provider);
            const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, backendSigner);

            const amountBase = ethers.parseUnits(amount.toString(), 6);

            console.log(`[YellowService] Executing transferFrom(${userAddress} -> ${this.wallet.address})...`);

            // This requires the user to have approved this.wallet.address already
            const tx = await usdcContract.transferFrom(userAddress, this.wallet.address, amountBase);
            console.log(`[YellowService] Escrow Tx Broadcast: ${tx.hash}`);
            await tx.wait();
            console.log(`[YellowService] Escrow Tx Confirmed. Funds locked.`);

            const sessionWallet = ethers.Wallet.createRandom();
            const sessionId = ethers.hexlify(ethers.randomBytes(16));

            return {
                sessionId,
                sessionKey: sessionWallet.privateKey,
            };
        } catch (error: any) {
            console.error(`[YellowService] Escrow start failed: ${error.message}`);
            throw new Error(`Failed to lock funds in escrow: ${error.message}`);
        }
    }

    /**
     * Settles the session on the Yellow Network.
     * Triggers the final on-chain settlement transaction (Escrow -> User).
     */
    async settleSession(session: SessionState): Promise<EndSessionResponse> {
        console.log(`[YellowService] Preparing settlement for Session ${session.sessionId}...`);

        const finalBalance = session.remainingBalance;
        const userAddress = session.userAddress;

        // Metrics Calculation
        const totalTrades = session.actionHistory?.filter(a => a.type === 'REBALANCE').length || 0;
        const gasSpentUSD = session.actionHistory?.reduce((sum, a) => sum + a.cost, 0) || 0;

        // Gas Saved: If each action was a separate mainnet-style tx ($0.50 each)
        // versus the optimized internal state updates.
        const normalFlowCost = (session.actionsExecuted || 0) * 0.50;
        const gasSavedUSD = Math.max(0, normalFlowCost - gasSpentUSD);

        const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
        const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

        try {
            const network = new ethers.Network('base-sepolia', 84532);
            const provider = new ethers.JsonRpcProvider('https://sepolia.base.org', network);
            const backendSigner = this.wallet.connect(provider);
            const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, backendSigner);

            const amountBase = ethers.parseUnits(finalBalance.toFixed(2), 6);

            console.log(`[YellowService] Releasing Escrow: ${finalBalance.toFixed(2)} USDC -> ${userAddress}...`);

            const tx = await usdcContract.transfer(userAddress, amountBase);
            console.log(`[YellowService] Settlement Tx hash: ${tx.hash}`);
            await tx.wait();

            return {
                settlementTxHash: tx.hash,
                finalBalance: finalBalance,
                totalTrades,
                gasSpentUSD,
                gasSavedUSD
            };
        } catch (error: any) {
            console.error(`[YellowService] ❌ Settlement Failed: ${error.message}`);
            throw new Error(`On-chain settlement failed: ${error.message}`);
        }
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
