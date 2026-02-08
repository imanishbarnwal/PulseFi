
import { ethers } from 'ethers';

const HOOK_ADDRESS = '0x66b72352b6c3f71320f24683f3ee91e84c23667c';
const ABI = ['function escrow() view returns (address)'];

async function main() {
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const hook = new ethers.Contract(HOOK_ADDRESS, ABI, provider);

    try {
        console.log("Reading escrow from Hook...");
        const escrow = await hook.escrow();
        console.log(`FOUND ESCROW ADDRESS: ${escrow}`);
    } catch (e) {
        console.error("Failed to read escrow:", e);
    }
}

main();
