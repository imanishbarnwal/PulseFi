
import { ethers } from 'ethers';

const ADDRESS = '0x83C522408955Bc57b1cbb2BA129Cc09320998290';

async function main() {
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const code = await provider.getCode(ADDRESS);
    console.log(`Code length: ${code.length}`);
    console.log(code === '0x' ? "CONTRACT NOT FOUND" : "CONTRACT EXISTS");
}

main();
