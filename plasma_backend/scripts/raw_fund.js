const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../server/.env") });

async function main() {
    const rpc = process.env.RPC_URL;
    const pk = process.env.PRIVATE_KEY;

    if (!rpc || !pk) {
        console.error("Missing RPC_URL or PRIVATE_KEY in ./server/.env");
        process.exit(1);
    }

    // Connect provider
    const provider = new ethers.JsonRpcProvider(rpc);

    // Connect wallet
    const wallet = new ethers.Wallet(pk, provider);
    console.log("Funding from Wallet:", wallet.address);

    try {
        const ethBal = await provider.getBalance(wallet.address);
        console.log("ETH Balance:", ethers.formatEther(ethBal));
    } catch (e) {
        console.error("Failed to check ETH balance:", e.message);
        return;
    }

    const tokenAddr = "0x98BED93332690f8E6c5e928a1505283c539Bf4e7";
    const buyerAddr = "0xCAB2571F8E7a2dD3fe318e15DE4D11d6f002a8a8";

    const abi = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
    ];

    const token = new ethers.Contract(tokenAddr, abi, wallet);

    try {
        // Get decimals
        const decimals = await token.decimals();
        const symbol = await token.symbol();

        // Check balance
        const tokenBal = await token.balanceOf(wallet.address);
        console.log(`Token Balance: ${ethers.formatUnits(tokenBal, decimals)} ${symbol}`);

        if (tokenBal == 0n) {
            console.error("Wallet has 0 tokens! Cannot fund buyer.");
            return;
        }

        // Amount to send: 100
        const amount = ethers.parseUnits("100.0", decimals);
        console.log(`Sending 100 ${symbol} to ${buyerAddr}...`);

        const tx = await token.transfer(buyerAddr, amount);
        console.log("Transaction Hash:", tx.hash);

        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("Transaction Confirmed!");

        const newBal = await token.balanceOf(buyerAddr);
        console.log(`New Buyer Balance: ${ethers.formatUnits(newBal, decimals)} ${symbol}`);

    } catch (e) {
        console.error("Error executing transfer:", e.message);
        if (e.info) console.error(e.info);
    }
}

main();
