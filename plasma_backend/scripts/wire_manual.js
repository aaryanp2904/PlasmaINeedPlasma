const { ethers } = require("hardhat");
const addresses = require("./deployed_addresses.json");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Wiring contracts with account:", deployer.address);

    const POOL_ADDRESS = addresses.POOL_ADDRESS;
    const POLICY_ADDRESS = addresses.POLICY_ADDRESS;
    const ESCROW_ADDRESS = addresses.ESCROW_ADDRESS;
    const ORACLE_ADDRESS = addresses.ORACLE_ADDRESS;

    console.log("Attaching to contracts...");
    const pool = await ethers.getContractAt("InsurancePool", POOL_ADDRESS);
    const policyManager = await ethers.getContractAt("PolicyManager", POLICY_ADDRESS);
    const escrow = await ethers.getContractAt("TicketEscrow", ESCROW_ADDRESS);
    const oracle = await ethers.getContractAt("FlightOutcomeOracle", ORACLE_ADDRESS);

    const overrides = { gasLimit: 2000000 };

    console.log("1. Setting PolicyManager in Pool...");
    try {
        const tx1 = await pool.setPolicyManager(POLICY_ADDRESS, overrides);
        console.log("Tx sent:", tx1.hash);
        await tx1.wait();
        console.log("Confirmed.");
    } catch (e) {
        console.log("Error or already set:", e.message);
    }

    console.log("2a. Setting Escrow in PolicyManager...");
    try {
        const tx2a = await policyManager.setEscrow(ESCROW_ADDRESS, overrides);
        console.log("Tx sent:", tx2a.hash);
        await tx2a.wait();
        console.log("Confirmed Escrow.");
    } catch (e) {
        console.log("Error or already set:", e.message);
    }

    console.log("2b. Setting Oracle in PolicyManager...");
    try {
        const tx2b = await policyManager.setOracle(ORACLE_ADDRESS, overrides);
        console.log("Tx sent:", tx2b.hash);
        await tx2b.wait();
        console.log("Confirmed Oracle.");
    } catch (e) {
        console.log("Error or already set:", e.message);
    }

    console.log("3. Setting Addresses in Escrow...");
    try {
        const tx3 = await escrow.setAddresses(POLICY_ADDRESS, POOL_ADDRESS, ORACLE_ADDRESS, overrides);
        console.log("Tx sent:", tx3.hash);
        await tx3.wait();
        console.log("Confirmed.");
    } catch (e) {
        console.log("Error or already set:", e.message);
    }

    console.log("Wiring complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
