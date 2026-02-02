
import { ethers } from 'ethers';

export const BASE_SEPOLIA_CHAIN_ID = 84532;
// In production, force this from ENV. For hackathon, default is fine.
export const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';

export async function validateChainConnection() {
    console.log(`[ChainValidator] Checking connection to: ${BASE_RPC_URL}`);
    try {
        const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
            throw new Error(`CRITICAL: Chain Mismatch! Expected Base Sepolia (${BASE_SEPOLIA_CHAIN_ID}), got ${chainId} (${network.name})`);
        }

        console.log(`[ChainValidator] ✅ Connected to Base Sepolia (Chain ID: ${chainId}). Safe to proceed.`);
        return true;
    } catch (error: any) {
        console.error(`[ChainValidator] ❌ Validation Error: ${error.message}`);
        process.exit(1); // Hard stop
    }
}
