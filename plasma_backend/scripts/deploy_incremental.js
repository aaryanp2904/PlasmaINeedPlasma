const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    // 1. Deploy InsurancePool
    console.log("Deploying InsurancePool...");
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    const pool = await InsurancePool.deploy();
    await pool.waitForDeployment();
    console.log("InsurancePool deployed to:", await pool.getAddress());
    // 2. Deploy PolicyManager
    console.log("Deploying PolicyManager...");
    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    const policyManager = await PolicyManager.deploy(await pool.getAddress());
    await policyManager.waitForDeployment();
    console.log("PolicyManager deployed to:", await policyManager.getAddress());
    // 3. Deploy TicketEscrow
    console.log("Deploying TicketEscrow...");
    const TicketEscrow = await ethers.getContractFactory("TicketEscrow");
    const escrow = await TicketEscrow.deploy();
    await escrow.waitForDeployment();
    console.log("TicketEscrow deployed to:", await escrow.getAddress());
    // 4. Deploy Oracle
    console.log("Deploying FlightOutcomeOracle...");
    const FlightOutcomeOracle = await ethers.getContractFactory("FlightOutcomeOracle");
    const signers = [deployer.address];
    const threshold = 1;
    const oracle = await FlightOutcomeOracle.deploy(
        await escrow.getAddress(),
        await policyManager.getAddress(),
        threshold,
        signers
    );
    await oracle.waitForDeployment();
    console.log("FlightOutcomeOracle deployed to:", await oracle.getAddress());
    // 5. Wire up dependencies
    console.log("Wiring up dependencies...");
    // Pool needs to trust PolicyManager
    const tx1 = await pool.setPolicyManager(await policyManager.getAddress(), { gasLimit: 1000000 });
    await tx1.wait();
    console.log("Pool initialized with PolicyManager");

    // PolicyManager needs to trust Escrow and Oracle
    const tx2 = await policyManager.setAuthorizedCallers(
        await escrow.getAddress(),
        await oracle.getAddress(),
        { gasLimit: 1000000 }
    );
    await tx2.wait();
    console.log("PolicyManager initialized with Escrow and Oracle");

    // Escrow needs to trust PolicyManager, Pool, and Oracle
    const tx3 = await escrow.setAddresses(
        await policyManager.getAddress(),
        await pool.getAddress(),
        await oracle.getAddress(),
        { gasLimit: 1000000 }
    );
    await tx3.wait();
    console.log("Escrow initialized with PolicyManager, Pool, and Oracle");

    console.log("Deployment and wiring complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
