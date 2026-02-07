const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PolicyManager", function () {
  let owner, escrow, oracle, buyer;
  let token, pool, policy;

  beforeEach(async function () {
    [owner, escrow, oracle, buyer] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock USDT0", "USDT0", 18);
    await token.waitForDeployment();

    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    pool = await InsurancePool.deploy();
    await pool.waitForDeployment();

    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    policy = await PolicyManager.deploy(await pool.getAddress());
    await policy.waitForDeployment();

    // Wire pool <-> policy manager
    await pool.setPolicyManager(await policy.getAddress());

    // Wire escrow/oracle on policy
    await policy.setEscrow(escrow.address);
    await policy.setOracle(oracle.address);

    // Prefund pool for payouts
    await token.mint(owner.address, ethers.parseUnits("10000", 18));
    await token.approve(await pool.getAddress(), ethers.MaxUint256);
    await pool.fundPool(await token.getAddress(), ethers.parseUnits("5000", 18));
  });

  it("Only escrow can mintPolicyFromEscrow, and it mints an NFT to holder", async function () {
    const ticketPrice = ethers.parseUnits("200", 18);
    const premium = ethers.parseUnits("10", 18);

    await expect(
      policy.mintPolicyFromEscrow(1, buyer.address, await token.getAddress(), ticketPrice, premium, 0)
    ).to.be.revertedWith("POLICY:NOT_ESCROW");

    const tx = await policy.connect(escrow).mintPolicyFromEscrow(
      1,
      buyer.address,
      await token.getAddress(),
      ticketPrice,
      premium,
      0
    );
    await tx.wait();

    const policyId = await policy.policyIdByOrder(1);
    expect(await policy.ownerOf(policyId)).to.equal(buyer.address);

    const p = await policy.policies(policyId);
    expect(p.orderId).to.equal(1n);
    expect(p.ticketPrice).to.equal(ticketPrice);
    expect(p.premium).to.equal(premium);
  });

  it("Only oracle can settlePolicy and it pays out for delay >=120 mins", async function () {
    const ticketPrice = ethers.parseUnits("400", 18);
    const premium = ethers.parseUnits("10", 18);

    await policy.connect(escrow).mintPolicyFromEscrow(
      1,
      buyer.address,
      await token.getAddress(),
      ticketPrice,
      premium,
      0
    );
    const policyId = await policy.policyIdByOrder(1);

    await expect(policy.settlePolicy(policyId, 2, 120))
      .to.be.revertedWith("POLICY:NOT_ORACLE");

    const buyerBalBefore = await token.balanceOf(buyer.address);

    await policy.connect(oracle).settlePolicy(policyId, 2, 120); // Delayed 120 => 25%
    const p = await policy.policies(policyId);
    expect(p.settled).to.equal(true);

    const expectedPayout = (ticketPrice * 2500n) / 10000n;
    expect(p.payout).to.equal(expectedPayout);

    const buyerBalAfter = await token.balanceOf(buyer.address);
    expect(buyerBalAfter - buyerBalBefore).to.equal(expectedPayout);

    await expect(policy.connect(oracle).settlePolicy(policyId, 2, 240))
      .to.be.revertedWith("POLICY:ALREADY_SETTLED");
  });
});
