
const { ethers } = require("ethers");
require("dotenv").config();
const { TicketEscrowAbi } = require("../server/src/contracts/abis");

async function main() {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const escrowAddress = process.env.ESCROW_ADDRESS;

    if (!rpcUrl || !privateKey || !escrowAddress) {
        console.error("Missing config in .env");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const escrow = new ethers.Contract(escrowAddress, TicketEscrowAbi, wallet);

    console.log("Setting Settlement Buffer to 0 seconds...");
    const tx = await escrow.setSettlementBuffer(0);
    console.log("Tx Hash:", tx.hash);
    await tx.wait();
    console.log("Buffer set to 0. You may encounter fewer TOO_EARLY errors if flight arrival has passed.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
