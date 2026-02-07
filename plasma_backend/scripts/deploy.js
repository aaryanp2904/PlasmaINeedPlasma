const hre = require("hardhat");

function parseList(name) {
  const v = process.env[name];
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  let signers = parseList("ORACLE_SIGNERS");
  let threshold = Number(process.env.ORACLE_THRESHOLD || "1");

  if (signers.length === 0) signers = [deployer.address];
  if (threshold < 1 || threshold > signers.length) {
    throw new Error(`Bad ORACLE_THRESHOLD=${threshold} for signers length=${signers.length}`);
  }

  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const pool = await InsurancePool.deploy();
  await pool.waitForDeployment();

  const PolicyManager = await hre.ethers.getContractFactory("PolicyManager");
  const policy = await PolicyManager.deploy(await pool.getAddress());
  await policy.waitForDeployment();

  const TicketEscrow = await hre.ethers.getContractFactory("TicketEscrow");
  const escrow = await TicketEscrow.deploy();
  await escrow.waitForDeployment();

  const FlightOutcomeOracle = await hre.ethers.getContractFactory("FlightOutcomeOracle");
  const oracle = await FlightOutcomeOracle.deploy(
    await escrow.getAddress(),
    await policy.getAddress(),
    threshold,
    signers
  );
  await oracle.waitForDeployment();

  // Wire contracts
  await (await pool.setPolicyManager(await policy.getAddress())).wait();
  await (await policy.setEscrow(await escrow.getAddress())).wait();
  await (await policy.setOracle(await oracle.getAddress())).wait();
  await (await escrow.setAddresses(await policy.getAddress(), await pool.getAddress(), await oracle.getAddress())).wait();

  console.log("POOL_ADDRESS=", await pool.getAddress());
  console.log("POLICY_ADDRESS=", await policy.getAddress());
  console.log("ESCROW_ADDRESS=", await escrow.getAddress());
  console.log("ORACLE_ADDRESS=", await oracle.getAddress());
  console.log("ORACLE_SIGNERS=", signers.join(","));
  console.log("ORACLE_THRESHOLD=", threshold);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
