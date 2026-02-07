const { expect } = require("chai");

describe("SimpleStorage", function () {
  let simpleStorage;

  beforeEach(async function () {
    const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
    simpleStorage = await SimpleStorage.deploy();
    await simpleStorage.waitForDeployment();
  });

  it("Should return the initial greeting", async function () {
    expect(await simpleStorage.getData()).to.equal("Hello, Plasma!");
  });

  it("Should update the stored data", async function () {
    await simpleStorage.setData("Updated data");
    expect(await simpleStorage.getData()).to.equal("Updated data");
  });
});