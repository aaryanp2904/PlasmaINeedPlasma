const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    // 1. InsurancePool
    console.log("Deploying InsurancePool...");
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    const pool = await InsurancePool.deploy();
    await pool.waitForDeployment();
    const poolAddr = await pool.getAddress();
    console.log("InsurancePool:", poolAddr);

    // 2. PolicyManager
    console.log("Deploying PolicyManager...");
    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    const policyManager = await PolicyManager.deploy(poolAddr);
    await policyManager.waitForDeployment();
    const policyAddr = await policyManager.getAddress();
    console.log("PolicyManager:", policyAddr);

    // 3. TicketEscrow
    console.log("Deploying TicketEscrow...");
    const TicketEscrow = await ethers.getContractFactory("TicketEscrow");
    const escrow = await TicketEscrow.deploy();
    await escrow.waitForDeployment();
    const escrowAddr = await escrow.getAddress();
    console.log("TicketEscrow:", escrowAddr);

    // 4. FlightOutcomeOracle
    console.log("Deploying FlightOutcomeOracle...");
    const FlightOutcomeOracle = await ethers.getContractFactory("FlightOutcomeOracle");
    const signers = [deployer.address];
    const threshold = 1;
    const oracle = await FlightOutcomeOracle.deploy(
        escrowAddr,
        policyAddr,
        threshold,
        signers
    );
    await oracle.waitForDeployment();
    const oracleAddr = await oracle.getAddress();
    console.log("FlightOutcomeOracle:", oracleAddr);

    console.log("---------------------------------------------------");
    console.log(`POOL_ADDRESS=${poolAddr}`);
    console.log(`POLICY_ADDRESS=${policyAddr}`);
    console.log(`ESCROW_ADDRESS=${escrowAddr}`);
    console.log(`ORACLE_ADDRESS=${oracleAddr}`);
    console.log("---------------------------------------------------");

    const fs = require("fs");
    const path = require("path");
    const output = {
        POOL_ADDRESS: poolAddr,
        POLICY_ADDRESS: policyAddr,
        ESCROW_ADDRESS: escrowAddr,
        ORACLE_ADDRESS: oracleAddr
    };
    fs.writeFileSync(path.join(__dirname, "deployed_addresses.json"), JSON.stringify(output, null, 2));
    console.log("Addresses written to deployed_addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
