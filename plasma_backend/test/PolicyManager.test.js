const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PolicyManager ERC20", function () {
  let owner, escrow, oracle, buyer;
  let pool, policy, token;

  beforeEach(async function () {
    [owner, escrow, oracle, buyer] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy();
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
    const fundAmt = ethers.parseUnits("1000", 18);
    await token.mint(owner.address, fundAmt);
    await token.approve(await pool.getAddress(), fundAmt);
    await pool.fundPool(await token.getAddress(), fundAmt);
  });

  it("Only escrow can mintPolicyFromEscrow, and it mints an NFT to holder with token address", async function () {
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
    expect(p.token).to.equal(await token.getAddress());
  });

  it("Only oracle can settlePolicy and it pays out tokens for delay >=120 mins", async function () {
    const ticketPrice = ethers.parseUnits("200", 18);
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

    // 120 mins delay = 25% payout of ticketPrice = 50 tokens
    await policy.connect(oracle).settlePolicy(policyId, 2, 120);

    const p = await policy.policies(policyId);
    expect(p.settled).to.equal(true);
    expect(p.payout).to.equal(ethers.parseUnits("50", 18));

    const buyerBalAfter = await token.balanceOf(buyer.address);
    expect(buyerBalAfter - buyerBalBefore).to.equal(ethers.parseUnits("50", 18));
  });
});
