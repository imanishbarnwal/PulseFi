
import { ethers } from 'ethers';

const PRIVATE_KEY = '54225372363a921574b0c727eba41a5ea2c39e45fb1abeaef190a043be8f35df';

async function main() {
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Address: ${wallet.address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
}

main();
