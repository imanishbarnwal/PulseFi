
import { ethers } from 'ethers';

const ADDRESS = '0x66b72352b6c3f71320f24683f3ee91e84c23667c';

async function main() {
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const code = await provider.getCode(ADDRESS);
    console.log(`Code length: ${code.length}`);
    console.log(code === '0x' ? "CONTRACT NOT FOUND" : "CONTRACT EXISTS");
}

main();
