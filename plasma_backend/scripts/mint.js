const hre = require("hardhat");
require("dotenv").config({ path: "./server/.env" });

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const tokenAddress = process.env.TOKEN_ADDRESS || "0x98BED93332690f8E6c5e928a1505283c539Bf4e7";
    const recipient = process.env.MINT_TO;
    const amount = process.env.MINT_AMOUNT || "1000";

    if (!recipient) {
        console.error("Please set MINT_TO env var");
        process.exit(1);
    }

    console.log(`Minting ${amount} tokens to ${recipient} using MockERC20 at ${tokenAddress}...`);

    const MockERC20 = await hre.ethers.getContractAt("MockERC20", tokenAddress);

    const tx = await MockERC20.mint(recipient, hre.ethers.parseUnits(amount, 18));
    console.log("Tx sent:", tx.hash);
    await tx.wait();
    console.log("Minted!");
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
