
const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config();

function loadArtifact(name) {
    const basePath = path.join(__dirname, "../artifacts/contracts");
    // MockERC20 is in mocks/MockERC20.sol/MockERC20.json
    // InsurancePool is in InsurancePool.sol/InsurancePool.json
    let solDir = `${name}.sol`;
    if (name === "MockERC20") solDir = `mocks/${name}.sol`;

    const jsonName = `${name}.json`;
    return require(path.join(basePath, solDir, jsonName));
}

async function main() {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const poolAddress = process.env.POOL_ADDRESS;
    const tokenAddress = process.env.TOKEN_ADDRESS;

    if (!rpcUrl || !privateKey || !poolAddress || !tokenAddress) {
        throw new Error("Missing config in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Wallet:", wallet.address);

    // Load ABIs
    const PoolArt = loadArtifact("InsurancePool");
    const TokenArt = loadArtifact("MockERC20");

    const pool = new ethers.Contract(poolAddress, PoolArt.abi, wallet);
    const token = new ethers.Contract(tokenAddress, TokenArt.abi, wallet);

    const amount = ethers.parseUnits("10000", 18); // Fund 10k tokens

    // 1. Mint tokens to self (if MockERC20)
    console.log("Minting tokens...");
    try {
        const txMint = await token.mint(wallet.address, amount);
        await txMint.wait();
    } catch (e) {
        console.log("Mint failed (maybe not MockERC20 or not owner), using existing balance...");
    }

    // 2. Approve Pool
    console.log("Approving Pool...");
    const txApprove = await token.approve(poolAddress, amount);
    await txApprove.wait();

    // 3. Fund Pool
    console.log("Funding Pool...");
    const txFund = await pool.fundPool(tokenAddress, amount);
    await txFund.wait();

    console.log(`Pool funded with 10000 tokens.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
