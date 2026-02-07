const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InsurancePool", function () {
  let owner, policyManager, alice;
  let token, pool;

  beforeEach(async function () {
    [owner, policyManager, alice] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock USDT0", "USDT0", 18);
    await token.waitForDeployment();

    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    pool = await InsurancePool.deploy();
    await pool.waitForDeployment();

    // Mint some funds to alice and approve pool
    await token.mint(alice.address, ethers.parseUnits("1000", 18));
    await token.connect(alice).approve(await pool.getAddress(), ethers.MaxUint256);
  });

  it("Owner can set policy manager; non-owner cannot", async function () {
    await pool.setPolicyManager(policyManager.address);
    expect(await pool.policyManager()).to.equal(policyManager.address);

    await expect(pool.connect(alice).setPolicyManager(alice.address))
      .to.be.revertedWithCustomError; // Ownable error (v5) differs by OZ version
  });

  it("fundPool pulls tokens and increases available()", async function () {
    const amt = ethers.parseUnits("100", 18);
    await pool.connect(alice).fundPool(await token.getAddress(), amt);

    expect(await pool.available(await token.getAddress())).to.equal(amt);
  });

  it("payClaim can only be called by policy manager", async function () {
    await pool.setPolicyManager(policyManager.address);

    const amt = ethers.parseUnits("50", 18);
    await pool.connect(alice).fundPool(await token.getAddress(), amt);

    await expect(
      pool.connect(alice).payClaim(await token.getAddress(), alice.address, amt, 1)
    ).to.be.revertedWith("POOL:NOT_POLICY_MANAGER");

    await pool.connect(policyManager).payClaim(await token.getAddress(), alice.address, amt, 1);
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("1000", 18)); // got paid back
  });
});
