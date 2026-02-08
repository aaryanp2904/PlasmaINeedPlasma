const { expect } = require("chai");
const { ethers } = require("hardhat");

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("TicketEscrow ERC20", function () {
  let owner, buyer, merchant, oracleSigner;
  let pool, policy, escrow, token;

  beforeEach(async function () {
    [owner, buyer, merchant, oracleSigner] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy(); // No args
    await token.waitForDeployment();

    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    pool = await InsurancePool.deploy();
    await pool.waitForDeployment();

    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    policy = await PolicyManager.deploy(await pool.getAddress());
    await policy.waitForDeployment();

    const TicketEscrow = await ethers.getContractFactory("TicketEscrow");
    escrow = await TicketEscrow.deploy();
    await escrow.waitForDeployment();

    // Wire addresses
    await escrow.setAddresses(await policy.getAddress(), await pool.getAddress(), oracleSigner.address);
    await policy.setEscrow(await escrow.getAddress());
    await policy.setOracle(owner.address);
    await pool.setPolicyManager(await policy.getAddress());

    // Mint tokens to buyer
    await token.mint(buyer.address, ethers.parseUnits("1000", 18));
    await token.connect(buyer).approve(await escrow.getAddress(), ethers.MaxUint256);
  });

  it("createOrder holds ticketPrice (ERC20) in escrow, forwards premium to pool", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 3600;
    const arrivalTs = now + 7200;
    const ticketPrice = ethers.parseUnits("100.0", 18);
    const premium = ethers.parseUnits("10.0", 18);
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("FLIGHT-ERC20"));

    const poolBalBefore = await token.balanceOf(await pool.getAddress());
    const escrowBalBefore = await token.balanceOf(await escrow.getAddress());

    const tx = await escrow.connect(buyer).createOrder(
      merchant.address,
      await token.getAddress(),
      ticketPrice,
      premium,
      flightIdHash,
      departTs,
      arrivalTs,
      false
    );
    const receipt = await tx.wait();

    const ev = receipt.logs
      .map((l) => {
        try { return escrow.interface.parseLog(l); } catch { return null; }
      })
      .find((x) => x && x.name === "OrderCreated");
    const orderId = ev.args.orderId;

    // Escrow should hold ticketPrice
    const escrowBalAfter = await token.balanceOf(await escrow.getAddress());
    expect(escrowBalAfter - escrowBalBefore).to.equal(ticketPrice);

    // Pool should hold premium
    const poolBalAfter = await token.balanceOf(await pool.getAddress());
    expect(poolBalAfter - poolBalBefore).to.equal(premium);

    // Check Order state
    const o = await escrow.orders(orderId);
    expect(o.buyer).to.equal(buyer.address);
    expect(o.token).to.equal(await token.getAddress());
    expect(o.ticketPrice).to.equal(ticketPrice);
  });

  it("buyInsurance takes premium from buyer (ERC20) and mints policy", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 3600;
    const arrivalTs = now + 7200;
    const ticketPrice = ethers.parseUnits("100", 18);
    const premium = ethers.parseUnits("10", 18);
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("FLIGHT-INSURANCE-ERC20"));

    // Create order WITHOUT premium first
    await escrow.connect(buyer).createOrder(
      merchant.address,
      await token.getAddress(),
      ticketPrice,
      0,
      flightIdHash,
      departTs,
      arrivalTs,
      false
    );
    const orderId = 1;

    // Now buy insurance
    await escrow.connect(buyer).buyInsurance(orderId, premium);

    const o = await escrow.orders(orderId);
    expect(o.premium).to.equal(premium);
    expect(o.status).to.equal(2); // ORDER_POLICY_LINKED
  });
});
