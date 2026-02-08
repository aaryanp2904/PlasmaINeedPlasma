const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Funding from:", deployer.address);

    // Check ETH balance
    const ethBal = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer ETH:", ethers.formatEther(ethBal));

    const buyerAddr = "0xCAB2571F8E7a2dD3fe318e15DE4D11d6f002a8a8";
    const tokenAddr = "0x98BED93332690f8E6c5e928a1505283c539Bf4e7";

    // Simplified ABI
    const abi = [
        "function transfer(address to, uint256 amount)",
        "function balanceOf(address account) view returns (uint256)",
        "function decimals() view returns (uint8)",
    ];

    const token = new ethers.Contract(tokenAddr, abi, deployer);

    let decimals = 18n;
    try {
        decimals = await token.decimals();
        console.log("Decimals:", decimals);
    } catch (e) {
        console.log("Could not get decimals, assuming 18. Error:", e.message);
    }

    // Check deployer token balance
    let balance;
    try {
        balance = await token.balanceOf(deployer.address);
        console.log(`Deployer Token Balance: ${ethers.formatUnits(balance, decimals)}`);
    } catch (e) {
        console.error("Failed to get balance:", e.message);
        return;
    }

    if (balance < ethers.parseUnits("100.0", decimals)) {
        console.error("WARNING: Deployer has very low token balance!");
        // Proceed anyway, maybe we have enough for a small transfer
    }

    // Transfer 100 tokens
    const amountStr = "100.0";
    const amount = ethers.parseUnits(amountStr, decimals);

    console.log(`Transferring ${amountStr} tokens to ${buyerAddr}...`);

    try {
        const tx = await token.transfer(buyerAddr, amount);
        console.log("Tx hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transfer mined in block", receipt.blockNumber);
    } catch (err) {
        console.error("Transfer failed:", err.message);
        if (err.data) console.error("Error data:", err.data);
    }

    // Check new balance
    try {
        const newBalance = await token.balanceOf(buyerAddr);
        console.log(`New Buyer Balance: ${ethers.formatUnits(newBalance, decimals)}`);
    } catch (e) {
        console.error("Failed to check new balance");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
