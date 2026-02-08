const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.RPC_URL || process.env.RPC_ENDPOINT;
    if (!rpcUrl) {
        console.error("No RPC_URL or RPC_ENDPOINT in .env");
        return;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`Connected to ${rpcUrl}`);

    const buyerAddr = "0xCAB2571F8E7a2dD3fe318e15DE4D11d6f002a8a8";
    const tokenAddr = "0x98BED93332690f8E6c5e928a1505283c539Bf4e7";
    const escrowAddr = "0xAE73B7Df38b61B185fabda207C3e4b953aE087C2";

    // Check Buyer Token Balance
    const erc20Abi = [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address, address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
    ];
    const token = new ethers.Contract(tokenAddr, erc20Abi, provider);

    try {
        const balance = await token.balanceOf(buyerAddr);
        const decimals = await token.decimals();
        const symbol = await token.symbol();
        const allowance = await token.allowance(buyerAddr, escrowAddr);

        console.log(`\nToken: ${symbol} (${tokenAddr})`);
        console.log(`Buyer: ${buyerAddr}`);
        console.log(`Balance: ${ethers.formatUnits(balance, decimals)} ${symbol} (raw: ${balance})`);
        console.log(`Allowance to Escrow: ${ethers.formatUnits(allowance, decimals)} ${symbol} (raw: ${allowance})`);

        // Requirement is 2 wei (ticket=1 + premium=1)
        if (balance < 2n) {
            console.error("\n[CRITICAL] INSUFFICIENT BALANCE! Buyer needs at least 2 wei.");
        } else {
            console.log("\n[OK] Balance sufficient.");
        }
    } catch (e) {
        console.error("Error checking token:", e.message);
    }

    // Check Escrow State
    const escrowAbi = [
        "function policyManager() view returns (address)",
        "function insurancePool() view returns (address)",
        "function oracle() view returns (address)"
    ];
    const escrow = new ethers.Contract(escrowAddr, escrowAbi, provider);

    try {
        console.log(`\nChecking Escrow State (${escrowAddr})...`);
        const pm = await escrow.policyManager();
        const pool = await escrow.insurancePool();
        const oracle = await escrow.oracle();

        console.log(`PolicyManager: ${pm}`);
        console.log(`InsurancePool: ${pool}`);
        console.log(`Oracle:        ${oracle}`);

        if (pm === ethers.ZeroAddress || pool === ethers.ZeroAddress) {
            console.error("\n[CRITICAL] Escrow addresses NOT set! createOrder will revert.");
        } else {
            console.log("\n[OK] Escrow addresses set.");
        }
    } catch (e) {
        console.error("Error checking escrow:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
