const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying token with account:", deployer.address);

    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy();
    await token.waitForDeployment();

    const address = await token.getAddress();
    console.log("MockERC20 deployed to:", address);
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
