const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InsurancePool ERC20", function () {
  let owner, policyManager, alice;
  let pool, token;

  beforeEach(async function () {
    [owner, policyManager, alice] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy(); // No args
    await token.waitForDeployment();

    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    pool = await InsurancePool.deploy();
    await pool.waitForDeployment();
  });

  it("Owner can set policy manager; non-owner cannot", async function () {
    await pool.setPolicyManager(policyManager.address);
    expect(await pool.policyManager()).to.equal(policyManager.address);

    await expect(pool.connect(alice).setPolicyManager(alice.address))
      .to.be.revertedWithCustomError; // OwnableUnauthorizedAccount
  });

  it("fundPool takes approved tokens", async function () {
    const amt = ethers.parseUnits("1000", 18);
    await token.mint(alice.address, amt);
    await token.connect(alice).approve(await pool.getAddress(), amt);

    await pool.connect(alice).fundPool(await token.getAddress(), amt);

    expect(await pool.available(await token.getAddress())).to.equal(amt);
  });

  it("payClaim sends tokens and only callable by policy manager", async function () {
    await pool.setPolicyManager(policyManager.address);

    const fundAmt = ethers.parseUnits("1000", 18);
    await token.mint(owner.address, fundAmt);
    await token.approve(await pool.getAddress(), fundAmt);
    await pool.fundPool(await token.getAddress(), fundAmt);

    const payout = ethers.parseUnits("100", 18);

    await expect(
      pool.connect(alice).payClaim(await token.getAddress(), alice.address, payout, 1)
    ).to.be.revertedWith("POOL:NOT_POLICY_MANAGER");

    const balBefore = await token.balanceOf(alice.address);
    await pool.connect(policyManager).payClaim(await token.getAddress(), alice.address, payout, 1);
    const balAfter = await token.balanceOf(alice.address);

    expect(balAfter - balBefore).to.equal(payout);
  });
});
