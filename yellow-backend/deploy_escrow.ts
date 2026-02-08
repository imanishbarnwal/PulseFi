
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

const PRIVATE_KEY = '54225372363a921574b0c727eba41a5ea2c39e45fb1abeaef190a043be8f35df';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const EXECUTOR_ADDRESS = '0x9FBB19112a2a7731E787058cC0e84c16e4cD7aB1';

async function main() {
    console.log("Deploying SessionEscrow...");
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const artifactPath = path.resolve('../out/SessionEscrow.sol/SessionEscrow.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at ${artifactPath}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    try {
        const contract = await factory.deploy(USDC_ADDRESS, EXECUTOR_ADDRESS);
        console.log(`Deploy Tx: ${contract.deploymentTransaction()?.hash}`);
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        console.log(`✅ SessionEscrow Deployed at: ${address}`);
    } catch (error) {
        console.error("Deployment failed:", error);
    }
}

main();
