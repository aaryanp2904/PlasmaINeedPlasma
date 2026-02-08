const { expect } = require("chai");
const { ethers } = require("hardhat");

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("FlightOutcomeOracle ERC20", function () {
  let owner, buyer, merchant;
  let s1, s2, s3;
  let pool, policy, escrow, oracle, token;

  beforeEach(async function () {
    [owner, buyer, merchant, s1, s2, s3] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy();
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
      2,
      [s1.address, s2.address, s3.address]
    );
    await oracle.waitForDeployment();

    // Wire everything
    await pool.setPolicyManager(await policy.getAddress());
    await policy.setEscrow(await escrow.getAddress());
    await policy.setOracle(await oracle.getAddress());
    await escrow.setAddresses(await policy.getAddress(), await pool.getAddress(), await oracle.getAddress());

    // Fund pool 
    const fundAmt = ethers.parseUnits("5000", 18);
    await token.mint(owner.address, fundAmt);
    await token.approve(await pool.getAddress(), fundAmt);
    await pool.fundPool(await token.getAddress(), fundAmt);

    // Give buyer tokens
    await token.mint(buyer.address, ethers.parseUnits("1000", 18));
    await token.connect(buyer).approve(await escrow.getAddress(), ethers.MaxUint256);
  });

  it("finalizeOutcome (2-of-3 sigs) settles policy payout (ERC20) + releases escrow", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const departTs = now + 60;
    const arrivalTs = now + 120;
    const ticketPrice = ethers.parseUnits("200", 18);
    const premium = ethers.parseUnits("10", 18);
    const flightIdHash = ethers.keccak256(ethers.toUtf8Bytes("DELAY-TEST-ERC20"));

    await escrow.connect(buyer).createOrder(
      merchant.address,
      await token.getAddress(),
      ticketPrice,
      premium,
      flightIdHash,
      departTs,
      arrivalTs,
      false
    );

    // Move time
    const target = arrivalTs + 1800; // +30m past arrival + buffer
    await increaseTime(target - now);

    // EIP-712 setup
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

    const orderId = 1;
    const status = 2; // Delayed
    const delayMins = 240; // 50% payout
    const reportedAt = (await ethers.provider.getBlock("latest")).timestamp;

    const value = { orderId, status, delayMins, reportedAt };

    const sig1 = await s1.signTypedData(domain, types, value);
    const sig2 = await s2.signTypedData(domain, types, value);

    const buyerBalBefore = await token.balanceOf(buyer.address);
    const merchBalBefore = await token.balanceOf(merchant.address);

    await oracle.finalizeOutcome(orderId, status, delayMins, reportedAt, [sig1, sig2]);

    // Merchant gets ticketPrice
    const merchBalAfter = await token.balanceOf(merchant.address);
    expect(merchBalAfter - merchBalBefore).to.equal(ticketPrice);

    // Buyer gets 50% payout from pool (50% of 200 = 100)
    const buyerBalAfter = await token.balanceOf(buyer.address);
    const expectedPayout = ethers.parseUnits("100", 18);
    expect(buyerBalAfter - buyerBalBefore).to.equal(expectedPayout);
  });
});
