import { LifiService } from './services/lifi';
import { ethers } from 'ethers';

// ... existing code ...

/**
 * Example of how the Agent triggers this.
 * In a real loop, this would check:
 * 1. Is balance > Threshold?
 * 2. Is 'bridgedRecently' flag false?
 */
async function triggerBridgeDemo() {
    const lifi = new LifiService();
    // Dummy signer for demo (In agent, use sessionKey)
    const signer = ethers.Wallet.createRandom();

    // Base Sepolia (84532) -> Sepolia (11155111)
    // 1 USDC (6 decimals)
    const result = await lifi.bridgeUsdc(
        signer,
        84532,
        11155111,
        "1000000"
    );

    console.log("Bridge Result:", result);
}
