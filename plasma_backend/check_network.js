const { ethers } = require("ethers");
require("dotenv").config({ path: "./server/.env" });

async function main() {
    const rpc = process.env.RPC_URL;
    console.log("RPC:", rpc);
    const provider = new ethers.JsonRpcProvider(rpc);

    try {
        const net = await provider.getNetwork();
        console.log("Chain ID:", net.chainId.toString());
    } catch (e) {
        console.error("Failed to connect to RPC:", e.message);
        return;
    }

    const token = process.env.TOKEN_ADDRESS;
    console.log("Token:", token);
    try {
        const code = await provider.getCode(token);
        console.log("Token Code Length:", code.length);
        if (code === "0x") console.log("WARNING: No code at token address!");
    } catch (e) {
        console.log("Error checking token:", e.message);
    }

    const escrow = process.env.ESCROW_ADDRESS;
    console.log("Escrow:", escrow);
    try {
        const escrowCode = await provider.getCode(escrow);
        console.log("Escrow Code Length:", escrowCode.length);
        if (escrowCode === "0x") console.log("WARNING: No code at Escrow address!");
    } catch (e) {
        console.log("Error checking escrow:", e.message);
    }
}

main();
