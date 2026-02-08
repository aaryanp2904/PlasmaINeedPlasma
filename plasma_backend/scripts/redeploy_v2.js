const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy InsurancePool
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    const pool = await InsurancePool.deploy();
    await pool.waitForDeployment();
    console.log("InsurancePool deployed to:", await pool.getAddress());

    // 2. Deploy PolicyManager
    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    const policyManager = await PolicyManager.deploy(await pool.getAddress());
    await policyManager.waitForDeployment();
    console.log("PolicyManager deployed to:", await policyManager.getAddress());

    // 3. Deploy TicketEscrow
    const TicketEscrow = await ethers.getContractFactory("TicketEscrow");
    const escrow = await TicketEscrow.deploy();
    await escrow.waitForDeployment();
    console.log("TicketEscrow deployed to:", await escrow.getAddress());

    // 4. Deploy Oracle
    const FlightOutcomeOracle = await ethers.getContractFactory("FlightOutcomeOracle");
    const signers = [deployer.address]; // Deployer is the signer for now
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
    // Pool needs to trust PolicyManager and Escrow
    await pool.setPolicyManager(await policyManager.getAddress());
    await pool.setEscrow(await escrow.getAddress());
    console.log("Pool initialized with PolicyManager and Escrow");

    // PolicyManager needs to trust Escrow and Oracle
    // PolicyManager needs to trust Escrow and Oracle
    await policyManager.setEscrow(await escrow.getAddress());
    await policyManager.setOracle(await oracle.getAddress());
    console.log("PolicyManager initialized with Escrow and Oracle");

    // Escrow needs to trust PolicyManager, Pool, and Oracle
    await escrow.setAddresses(
        await policyManager.getAddress(),
        await pool.getAddress(),
        await oracle.getAddress()
    );
    console.log("Escrow initialized with PolicyManager, Pool, and Oracle");

    // Save addresses to .env
    const mockToken = process.env.TOKEN_ADDRESS || "0x98BED93332690f8E6c5e928a1505283c539Bf4e7"; // Keep existing token

    const envContent = `PRIVATE_KEY=${process.env.PRIVATE_KEY}
RPC_URL=${process.env.RPC_URL}
CHAIN_ID=${process.env.CHAIN_ID}
# Deployer: ${deployer.address}
POOL_ADDRESS=${await pool.getAddress()}
POLICY_ADDRESS=${await policyManager.getAddress()}
ESCROW_ADDRESS=${await escrow.getAddress()}
ORACLE_ADDRESS=${await oracle.getAddress()}
ORACLE_SIGNERS=${deployer.address}
ORACLE_THRESHOLD=1
DEFAULT_MERCHANT=${deployer.address}
TOKEN_ADDRESS=${mockToken}
TOKEN_DECIMALS=18

DEPLOY_BLOCK=0

# For oracle signing + submission (server-side key)
ORACLE_SIGNER_PRIVATE_KEY=${process.env.PRIVATE_KEY}

AMADEUS_CLIENT_ID="${process.env.AMADEUS_CLIENT_ID}"
AMADEUS_CLIENT_SECRET="${process.env.AMADEUS_CLIENT_SECRET}"
AMADEUS_ENV=${process.env.AMADEUS_ENV}
ALLOWED_ORIGINS=${process.env.ALLOWED_ORIGINS}
`;

    const serverEnvPath = path.resolve(__dirname, "../server/.env");
    const rootEnvPath = path.resolve(__dirname, "../.env");
    const frontendEnvPath = path.resolve(__dirname, "../../Allinonetravelpaymentsapp/.env");

    // Helper to update specific keys in a .env file content
    const updateEnvContent = (originalContent, newValues) => {
        let content = originalContent || "";
        for (const [key, value] of Object.entries(newValues)) {
            const regex = new RegExp(`^${key}=.*`, "m");
            if (regex.test(content)) {
                content = content.replace(regex, `${key}=${value}`);
            } else {
                content += `\n${key}=${value}`;
            }
        }
        return content;
    };

    const newValues = {
        POOL_ADDRESS: await pool.getAddress(),
        POLICY_ADDRESS: await policyManager.getAddress(),
        ESCROW_ADDRESS: await escrow.getAddress(),
        ORACLE_ADDRESS: await oracle.getAddress(),
        ORACLE_SIGNERS: deployer.address,
        ORACLE_THRESHOLD: threshold,
        DEFAULT_MERCHANT: deployer.address,
        TOKEN_ADDRESS: mockToken
    };

    try {
        if (fs.existsSync(serverEnvPath)) {
            const content = fs.readFileSync(serverEnvPath, "utf8");
            fs.writeFileSync(serverEnvPath, updateEnvContent(content, newValues));
            console.log("Updated server/.env");
        }

        if (fs.existsSync(rootEnvPath)) {
            const content = fs.readFileSync(rootEnvPath, "utf8");
            fs.writeFileSync(rootEnvPath, updateEnvContent(content, newValues));
            console.log("Updated .env");
        }

        if (fs.existsSync(frontendEnvPath)) {
            const content = fs.readFileSync(frontendEnvPath, "utf8");
            fs.writeFileSync(frontendEnvPath, updateEnvContent(content, newValues));
            console.log("Updated frontend .env");
        }
    } catch (err) {
        console.error("Error updating .env files:", err);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
