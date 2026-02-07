const { expect } = require("chai");
const { ethers } = require("hardhat");

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("TicketEscrow", function () {
  let owner, buyer, merchant, oracleSigner;
  let token, pool, policy, escrow;

  beforeEach(async function () {
    [owner, buyer, merchant, oracleSigner] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock USDT0", "USDT0", 18);
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

    // Wire addresses (oracle is just a signer here; settleOrder checks msg.sender==oracle)
    await escrow.setAddresses(await policy.getAddress(), await pool.getAddress(), oracleSigner.address);
    await policy.setEscrow(await escrow.getAddress());
    await policy.setOracle(owner.address); // not used in these tests
    await pool.setPolicyManager(await policy.getAddress());

    // Fund pool (so policy could pay later if needed)
    await token.mint(owner.address, ethers.parseUnits("10000", 18));
    await token.approve(await pool.getAddress(), ethers.MaxUint256);
    await pool.fundPool(await token.getAddress(), ethers.parseUnits("5000", 18));

    // Mint buyer funds and approve escrow
    await token.mint(buyer.address, ethers.parseUnits("1000", 18));
    await token.connect(buyer).approve(await escrow.getAddress(), ethers.MaxUint256);
  });

  it("createOrder holds ticketPrice in escrow, forwards premium to pool, and mints a policy NFT", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 3600;
    const arrivalTs = now + 7200;
    const ticketPrice = ethers.parseUnits("200", 18);
    const premium = ethers.parseUnits("10", 18);
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("BA123-2026-02-07-LHR-JFK"));

    const buyerBalBefore = await token.balanceOf(buyer.address);

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

    // Get orderId from event
    const ev = receipt.logs
      .map((l) => {
        try { return escrow.interface.parseLog(l); } catch { return null; }
      })
      .find((x) => x && x.name === "OrderCreated");

    const orderId = ev.args.orderId;

    // Ticket funds should be in escrow, premium in pool
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(ticketPrice);
    expect(await token.balanceOf(await pool.getAddress())).to.equal(premium + ethers.parseUnits("5000", 18)); // prefund + premium

    const o = await escrow.orders(orderId);
    expect(o.buyer).to.equal(buyer.address);
    expect(o.merchant).to.equal(merchant.address);
    expect(o.ticketPrice).to.equal(ticketPrice);

    // Policy minted and linked
    const policyId = o.policyId;
    expect(policyId).to.not.equal(0n);
    expect(await policy.ownerOf(policyId)).to.equal(buyer.address);

    const buyerBalAfter = await token.balanceOf(buyer.address);
    expect(buyerBalBefore - buyerBalAfter).to.equal(ticketPrice + premium);
  });

  it("settleOrder releases to merchant on on-time (after arrival+buffer) and only oracle can call", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 3600;
    const arrivalTs = now + 3700;
    const ticketPrice = ethers.parseUnits("100", 18);
    const premium = 0;
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("ON-TIME"));

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
      .map((l) => { try { return escrow.interface.parseLog(l); } catch { return null; } })
      .find((x) => x && x.name === "OrderCreated");
    const orderId = ev.args.orderId;

    await expect(escrow.connect(buyer).settleOrder(orderId, 1, 0))
      .to.be.revertedWith("ESCROW:NOT_ORACLE");

    // Too early
    await expect(escrow.connect(oracleSigner).settleOrder(orderId, 1, 0))
      .to.be.revertedWith("ESCROW:TOO_EARLY");

    // Jump to arrival + 30 min buffer
    await increaseTime((arrivalTs + 1800) - (await ethers.provider.getBlock("latest")).timestamp);

    const merchBefore = await token.balanceOf(merchant.address);
    await escrow.connect(oracleSigner).settleOrder(orderId, 1, 0);

    const merchAfter = await token.balanceOf(merchant.address);
    expect(merchAfter - merchBefore).to.equal(ticketPrice);
  });

  it("refundOnCancel=true refunds buyer on cancel", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 10;
    const arrivalTs = now + 20;
    const ticketPrice = ethers.parseUnits("50", 18);
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("CANCEL-REFUND"));

    const tx = await escrow.connect(buyer).createOrder(
      merchant.address,
      await token.getAddress(),
      ticketPrice,
      0,
      flightIdHash,
      departTs,
      arrivalTs,
      true // refundOnCancel
    );
    const receipt = await tx.wait();
    const orderId = receipt.logs
      .map((l) => { try { return escrow.interface.parseLog(l); } catch { return null; } })
      .find((x) => x && x.name === "OrderCreated").args.orderId;

    await increaseTime((arrivalTs + 1800) - (await ethers.provider.getBlock("latest")).timestamp);

    const buyerBefore = await token.balanceOf(buyer.address);
    await escrow.connect(oracleSigner).settleOrder(orderId, 3, 0); // Cancelled
    const buyerAfter = await token.balanceOf(buyer.address);

    expect(buyerAfter - buyerBefore).to.equal(ticketPrice);
  });
});
