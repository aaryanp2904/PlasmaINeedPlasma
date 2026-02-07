const { expect } = require("chai");
const { ethers } = require("hardhat");

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("FlightOutcomeOracle", function () {
  let owner, buyer, merchant;
  let s1, s2, s3; // committee signers
  let token, pool, policy, escrow, oracle;

  beforeEach(async function () {
    [owner, buyer, merchant, s1, s2, s3] = await ethers.getSigners();

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

    const FlightOutcomeOracle = await ethers.getContractFactory("FlightOutcomeOracle");
    oracle = await FlightOutcomeOracle.deploy(
      await escrow.getAddress(),
      await policy.getAddress(),
      2, // threshold
      [s1.address, s2.address, s3.address]
    );
    await oracle.waitForDeployment();

    // Wire everything
    await pool.setPolicyManager(await policy.getAddress());
    await policy.setEscrow(await escrow.getAddress());
    await policy.setOracle(await oracle.getAddress());
    await escrow.setAddresses(await policy.getAddress(), await pool.getAddress(), await oracle.getAddress());

    // Fund pool for payouts
    await token.mint(owner.address, ethers.parseUnits("100000", 18));
    await token.approve(await pool.getAddress(), ethers.MaxUint256);
    await pool.fundPool(await token.getAddress(), ethers.parseUnits("50000", 18));

    // Fund buyer & approve escrow
    await token.mint(buyer.address, ethers.parseUnits("1000", 18));
    await token.connect(buyer).approve(await escrow.getAddress(), ethers.MaxUint256);
  });

  it("finalizeOutcome (2-of-3 sigs) settles policy payout + releases escrow to merchant for delayed flight", async function () {
    // Create insured order
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 60;
    const arrivalTs = now + 120;
    const ticketPrice = ethers.parseUnits("200", 18);
    const premium = ethers.parseUnits("10", 18);
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("DELAY-TEST"));

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
    const orderId = receipt.logs
      .map((l) => { try { return escrow.interface.parseLog(l); } catch { return null; } })
      .find((x) => x && x.name === "OrderCreated").args.orderId;

    // Move time to arrival + buffer
    const target = arrivalTs + 1800;
    await increaseTime(target - (await ethers.provider.getBlock("latest")).timestamp);

    // Prepare EIP-712 signatures (ethers v6)
    const net = await ethers.provider.getNetwork();
    const domain = {
      name: "FlightOutcomeOracle",
      version: "1",
      chainId: net.chainId,
      verifyingContract: await oracle.getAddress(),
    };

    const types = {
      Outcome: [
        { name: "orderId", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "delayMins", type: "uint32" },
        { name: "reportedAt", type: "uint40" },
      ],
    };

    const status = 2;      // Delayed
    const delayMins = 240; // => 50% payout
    const reportedAt = (await ethers.provider.getBlock("latest")).timestamp;

    const value = { orderId, status, delayMins, reportedAt };

    const sig1 = await s1.signTypedData(domain, types, value);
    const sig2 = await s2.signTypedData(domain, types, value);

    const buyerBefore = await token.balanceOf(buyer.address);
    const merchBefore = await token.balanceOf(merchant.address);

    await oracle.finalizeOutcome(orderId, status, delayMins, reportedAt, [sig1, sig2]);

    // Merchant gets ticketPrice
    const merchAfter = await token.balanceOf(merchant.address);
    expect(merchAfter - merchBefore).to.equal(ticketPrice);

    // Buyer gets 50% payout from pool
    const buyerAfter = await token.balanceOf(buyer.address);
    const expectedPayout = (ticketPrice * 5000n) / 10000n;
    expect(buyerAfter - buyerBefore).to.equal(expectedPayout);

    expect(await oracle.finalized(orderId)).to.equal(true);
  });

  it("reverts if not enough valid signatures", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 10;
    const arrivalTs = now + 20;
    const ticketPrice = ethers.parseUnits("10", 18);
    const premium = ethers.parseUnits("1", 18);
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("SIGS"));

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
    const orderId = receipt.logs
      .map((l) => { try { return escrow.interface.parseLog(l); } catch { return null; } })
      .find((x) => x && x.name === "OrderCreated").args.orderId;

    await increaseTime((arrivalTs + 1800) - (await ethers.provider.getBlock("latest")).timestamp);

    const net = await ethers.provider.getNetwork();
    const domain = {
      name: "FlightOutcomeOracle",
      version: "1",
      chainId: net.chainId,
      verifyingContract: await oracle.getAddress(),
    };

    const types = {
      Outcome: [
        { name: "orderId", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "delayMins", type: "uint32" },
        { name: "reportedAt", type: "uint40" },
      ],
    };

    const reportedAt = (await ethers.provider.getBlock("latest")).timestamp;
    const value = { orderId, status: 1, delayMins: 0, reportedAt };

    const sig1 = await s1.signTypedData(domain, types, value);

    await expect(
      oracle.finalizeOutcome(orderId, 1, 0, reportedAt, [sig1])
    ).to.be.revertedWith("ORACLE:NOT_ENOUGH_SIGS");
  });

  it("refundOnCancel=true refunds buyer and suppresses cancel insurance payout", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 60;
    const arrivalTs = now + 120;

    const ticketPrice = ethers.parseUnits("100", 18);
    const premium = ethers.parseUnits("10", 18);
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("CANCEL-REFUND-SUPPRESS"));

    const tx = await escrow.connect(buyer).createOrder(
      merchant.address,
      await token.getAddress(),
      ticketPrice,
      premium,
      flightIdHash,
      departTs,
      arrivalTs,
      true // refundOnCancel
    );
    const receipt = await tx.wait();
    const orderId = receipt.logs
      .map((l) => { try { return escrow.interface.parseLog(l); } catch { return null; } })
      .find((x) => x && x.name === "OrderCreated").args.orderId;

    // Move time to arrival + buffer
    await increaseTime((arrivalTs + 1800) - (await ethers.provider.getBlock("latest")).timestamp);

    // EIP-712 signatures for CANCELLED
    const net = await ethers.provider.getNetwork();
    const domain = {
      name: "FlightOutcomeOracle",
      version: "1",
      chainId: net.chainId,
      verifyingContract: await oracle.getAddress(),
    };
    const types = {
      Outcome: [
        { name: "orderId", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "delayMins", type: "uint32" },
        { name: "reportedAt", type: "uint40" },
      ],
    };

    const status = 3; // Cancelled
    const delayMins = 0;
    const reportedAt = (await ethers.provider.getBlock("latest")).timestamp;
    const value = { orderId, status, delayMins, reportedAt };

    const sig1 = await s1.signTypedData(domain, types, value);
    const sig2 = await s2.signTypedData(domain, types, value);

    // Buyer should get ticketPrice refunded from escrow, and NO 100% policy payout (suppressed)
    const buyerBefore = await token.balanceOf(buyer.address);
    await oracle.finalizeOutcome(orderId, status, delayMins, reportedAt, [sig1, sig2]);
    const buyerAfter = await token.balanceOf(buyer.address);

    // Refund should be exactly ticketPrice (no extra payout)
    expect(buyerAfter - buyerBefore).to.equal(ticketPrice);
  });
});
