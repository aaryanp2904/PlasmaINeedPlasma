const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const poolAddress = process.env.POOL_ADDRESS;
    const tokenAddress = process.env.TOKEN_ADDRESS;

    if (!poolAddress || !tokenAddress) {
        throw new Error("Missing config in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("Wallet:", wallet.address);
    console.log("Pool:", poolAddress);
    console.log("Token:", tokenAddress);

    // ABIs
    const tokenAbi = [
        "function mint(address to, uint256 amount) external",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address owner) view returns (uint256)"
    ];
    const poolAbi = [
        "function fundPool(address token, uint256 amount) external"
    ];

    const token = new ethers.Contract(tokenAddress, tokenAbi, wallet);
    const pool = new ethers.Contract(poolAddress, poolAbi, wallet);

    const amount = ethers.parseUnits("100000", 18); // Fund 100k tokens

    // 1. Mint tokens to self
    console.log("Minting 100k tokens to wallet...");
    try {
        const txMint = await token.mint(wallet.address, amount);
        await txMint.wait();
        console.log("Minted.");
    } catch (e) {
        console.log("Mint failed (maybe not allowed), checking balance...");
    }

    const bal = await token.balanceOf(wallet.address);
    console.log("Wallet Balance:", ethers.formatUnits(bal, 18));

    if (bal < amount) {
        throw new Error("Insufficient balance to fund pool");
    }

    // 2. Approve Pool
    console.log("Approving Pool...");
    const txApprove = await token.approve(poolAddress, amount);
    await txApprove.wait();

    // 3. Fund Pool
    console.log("Funding Pool...");
    const txFund = await pool.fundPool(tokenAddress, amount);
    await txFund.wait();

    console.log(`Pool funded with 100000 tokens.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
