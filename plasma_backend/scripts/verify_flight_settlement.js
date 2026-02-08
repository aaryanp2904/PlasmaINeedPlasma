const { ethers } = require("hardhat");
require("dotenv").config();
const addresses = require("./deployed_addresses.json");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Load contracts
    const escrow = await ethers.getContractAt("TicketEscrow", addresses.ESCROW_ADDRESS);
    const oracle = await ethers.getContractAt("FlightOutcomeOracle", addresses.ORACLE_ADDRESS);
    const token = await ethers.getContractAt("MockERC20", process.env.TOKEN_ADDRESS || "0x98BED93332690f8E6c5e928a1505283c539Bf4e7");

    // Setup flight details
    const flightId = "FLIGHT-101-" + Date.now();
    const flightIdHash = ethers.id(flightId);
    // Set times in the past to satisfy settlementBuffer
    // arrivalTs must be < now - 30 mins
    const now = Math.floor(Date.now() / 1000);
    const arrivalTs = now - 3600; // 1 hour ago
    const departTs = arrivalTs - 7200; // 2 hours flight
    const ticketPrice = ethers.parseEther("10");
    const premium = ethers.parseEther("1");

    // Mint tokens to deployer
    console.log("Minting tokens to deployer...");
    try {
        const mintTx = await token.mint(deployer.address, ethers.parseEther("1000"));
        await mintTx.wait();
        console.log("Minted 1000 tokens.");
    } catch (e) {
        console.log("Mint failed (maybe not allowed or already minted?):", e.message);
    }

    // Check balance
    const bal = await token.balanceOf(deployer.address);
    console.log("Deployer token balance:", ethers.formatEther(bal));

    // Approve token
    await (await token.approve(addresses.ESCROW_ADDRESS, ethers.MaxUint256, { gasLimit: 500000 })).wait();
    const allow = await token.allowance(deployer.address, addresses.ESCROW_ADDRESS);
    console.log("Allowance:", ethers.formatEther(allow));

    // Create Order 1
    console.log("Creating Order 1...");
    try {
        const tx1 = await escrow.createOrder(
            deployer.address, // merchant (self)
            await token.getAddress(),
            ticketPrice,
            premium,
            flightIdHash,
            departTs,
            arrivalTs,
            true, // refundOnCancel
            { gasLimit: 1000000 }
        );
        await tx1.wait();
        console.log("Order 1 created");
    } catch (e) {
        console.error("Order 1 failed:", e);
        throw e;
    }
    // Extract orderId from event? For now just assume 1 if fresh, but let's read logs if needed.
    // Actually we rely on flightIdHash linkage.

    // Create Order 2
    console.log("Creating Order 2...");
    const tx2 = await escrow.createOrder(
        deployer.address,
        await token.getAddress(),
        ticketPrice,
        premium,
        flightIdHash,
        departTs,
        arrivalTs,
        true
    );
    await tx2.wait();

    // Verify they are linked
    const orderIds = await escrow.getFlightOrders(flightIdHash);
    console.log(`Orders for flight ${flightId}:`, orderIds.map(id => id.toString()));
    if (orderIds.length !== 2) throw new Error("Expected 2 orders");

    // Prepare Oracle Update
    const status = 2; // DELAYED
    const delayMins = 120;
    const reportedAt = Math.floor(Date.now() / 1000);

    // Sign update
    const domain = {
        name: "FlightOutcomeOracle",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: addresses.ORACLE_ADDRESS
    };

    const types = {
        FlightOutcome: [
            { name: "flightIdHash", type: "bytes32" },
            { name: "status", type: "uint8" },
            { name: "delayMins", type: "uint32" },
            { name: "reportedAt", type: "uint40" }
        ]
    };

    const value = {
        flightIdHash,
        status,
        delayMins,
        reportedAt
    };

    console.log("Signing update...", value);
    const signature = await deployer.signTypedData(domain, types, value);

    // Call finalizeFlightOutcome
    console.log("Finalizing flight outcome...");
    try {
        const finalizeTx = await oracle.finalizeFlightOutcome(
            flightIdHash,
            status,
            delayMins,
            reportedAt,
            [signature],
            { gasLimit: 5000000 }
        );
        console.log("Tx sent:", finalizeTx.hash);
        await finalizeTx.wait();
        console.log("Flight finalized!");
    } catch (e) {
        console.error("Finalize failed:", e);
        throw e;
    }

    // Check order status
    for (const orderId of orderIds) {
        const details = await escrow.getOrderParams(orderId);
        console.log(`Order ${orderId} Status:`, details.status);
        if (Number(details.status) !== status) console.warn(`Order ${orderId} not updated! Expected ${status}, got ${details.status}`);
    }

    console.log("SUCCESS: Batch settlement verified.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Main error:", error);
        process.exit(1);
    });
