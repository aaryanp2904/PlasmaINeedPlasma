
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Helper to load artifacts
function loadArtifact(name) {
    // Search in artifacts/contracts/Name.sol/Name.json
    const basePath = path.join(__dirname, "../artifacts/contracts");
    const solDir = `${name}.sol`;
    const jsonName = `${name}.json`;
    return require(path.join(basePath, solDir, jsonName));
}

async function main() {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
        throw new Error("Missing RPC_URL or PRIVATE_KEY in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Deployer:", wallet.address);

    // Load Artifacts
    const InsurancePoolArt = loadArtifact("InsurancePool");
    const PolicyManagerArt = loadArtifact("PolicyManager");
    const TicketEscrowArt = loadArtifact("TicketEscrow");
    const FlightOutcomeOracleArt = loadArtifact("FlightOutcomeOracle");

    // Deploy InsurancePool
    console.log("Deploying InsurancePool...");
    const PoolFactory = new ethers.ContractFactory(InsurancePoolArt.abi, InsurancePoolArt.bytecode, wallet);
    const pool = await PoolFactory.deploy();
    await pool.waitForDeployment();
    const poolAddr = await pool.getAddress();
    console.log("InsurancePool deployed at:", poolAddr);

    // Deploy PolicyManager
    console.log("Deploying PolicyManager...");
    const PolicyFactory = new ethers.ContractFactory(PolicyManagerArt.abi, PolicyManagerArt.bytecode, wallet);
    const policy = await PolicyFactory.deploy(poolAddr);
    await policy.waitForDeployment();
    const policyAddr = await policy.getAddress();
    console.log("PolicyManager deployed at:", policyAddr);

    // Deploy TicketEscrow
    console.log("Deploying TicketEscrow...");
    const EscrowFactory = new ethers.ContractFactory(TicketEscrowArt.abi, TicketEscrowArt.bytecode, wallet);
    const escrow = await EscrowFactory.deploy();
    await escrow.waitForDeployment();
    const escrowAddr = await escrow.getAddress();
    console.log("TicketEscrow deployed at:", escrowAddr);

    // Config for Oracle
    const signersRaw = process.env.ORACLE_SIGNERS || wallet.address;
    const signers = signersRaw.split(",").map(s => s.trim()).filter(Boolean);
    const threshold = parseInt(process.env.ORACLE_THRESHOLD || "1");

    // Deploy FlightOutcomeOracle
    console.log("Deploying FlightOutcomeOracle...");
    const OracleFactory = new ethers.ContractFactory(FlightOutcomeOracleArt.abi, FlightOutcomeOracleArt.bytecode, wallet);
    const oracle = await OracleFactory.deploy(escrowAddr, policyAddr, threshold, signers);
    await oracle.waitForDeployment();
    const oracleAddr = await oracle.getAddress();
    console.log("FlightOutcomeOracle deployed at:", oracleAddr);

    // Wiring
    console.log("Wiring contracts...");

    console.log("pool.setPolicyManager...");
    const tx1 = await pool.setPolicyManager(policyAddr);
    await tx1.wait();

    console.log("policy.setEscrow...");
    const tx2 = await policy.setEscrow(escrowAddr);
    await tx2.wait();

    console.log("policy.setOracle...");
    const tx3 = await policy.setOracle(oracleAddr);
    await tx3.wait();

    console.log("escrow.setAddresses...");
    const tx4 = await escrow.setAddresses(policyAddr, poolAddr, oracleAddr);
    await tx4.wait();

    console.log("\n=== Deployment Complete ===");
    console.log(`POOL_ADDRESS=${poolAddr}`);
    console.log(`POLICY_ADDRESS=${policyAddr}`);
    console.log(`ESCROW_ADDRESS=${escrowAddr}`);
    console.log(`ORACLE_ADDRESS=${oracleAddr}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
