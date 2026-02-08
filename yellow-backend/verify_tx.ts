
import { ethers } from 'ethers';

const TX_HASH = '0xa512200c4322d87670f4ea25782438b7ade118166d914860757903abce511354';

async function main() {
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const tx = await provider.getTransaction(TX_HASH);

    if (tx) {
        console.log(`✅ Transaction Found!`);
        console.log(`Block: ${tx.blockNumber}`);
        console.log(`From: ${tx.from}`);
        console.log(`To: ${tx.to}`); // Should be SessionEscrow (0x83C5...)
        console.log(`Value: ${ethers.formatEther(tx.value)} ETH`);
    } else {
        console.log("❌ Transaction not found. Only simulated in memory?");
    }
}

main();
