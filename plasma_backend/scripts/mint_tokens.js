const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../server/.env") });

async function main() {
    const rpcUrl = process.env.RPC_URL || "https://testnet-rpc.plasma.to";
    const privateKey = process.env.PRIVATE_KEY;
    const tokenAddress = process.env.TOKEN_ADDRESS;

    if (!privateKey) throw new Error("Missing PRIVATE_KEY in .env");
    if (!tokenAddress) throw new Error("Missing TOKEN_ADDRESS in .env");

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Using Wallet: ${wallet.address}`);
    console.log(`Token Address: ${tokenAddress}`);

    // ABI for mint function
    const abi = [
        "function mint(address to, uint256 amount) external",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
    ];

    const token = new ethers.Contract(tokenAddress, abi, wallet);

    // Target address: Default to the buyer observed in logs, or take from CLI arg
    // usage: node scripts/mint_tokens.js <address>
    const targetAddress = process.argv[2] || "0xCAB2571F8E7a2dD3fe318e15DE4D11d6f002a8a8";

    console.log(`\nTarget Address: ${targetAddress}`);

    try {
        const decimals = await token.decimals();
        const symbol = await token.symbol();
        const balanceBefore = await token.balanceOf(targetAddress);
        console.log(`Balance Before: ${ethers.formatUnits(balanceBefore, decimals)} ${symbol}`);

        const mintAmount = ethers.parseUnits("1000000", decimals); // Mint 1000 tokens
        console.log(`Minting 1000 ${symbol}...`);

        const tx = await token.mint(targetAddress, mintAmount);
        console.log(`Tx sent: ${tx.hash}`);

        await tx.wait();
        console.log("Transaction confirmed!");

        const balanceAfter = await token.balanceOf(targetAddress);
        console.log(`Balance After:  ${ethers.formatUnits(balanceAfter, decimals)} ${symbol}`);

    } catch (err) {
        console.error("Error minting tokens:", err);
    }
}

main();
