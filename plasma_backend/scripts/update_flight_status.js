
const readline = require('readline');
const http = require('http');
const { ethers } = require('ethers');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const API_BASE = 'http://localhost:8000/api/oracle';

function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function postRequest(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: `/api/oracle${path}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(body));
                    } else {
                        reject(new Error(`Status ${res.statusCode}: ${body}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    console.log("=== Flight Outcome Oracle Simulator (Batch Mode) ===");
    console.log("This tool settles ALL orders for a given Flight ID.");

    try {
        const flightId = await ask("Enter Flight ID (e.g. UA123): ");
        if (!flightId) throw new Error("Flight ID is required");

        const date = await ask("Enter Travel Date (YYYY-MM-DD): ");
        if (!date) throw new Error("Date is required");

        // Compute Keccak-256 hash using ethers (ethers.id hashes a string using keccak256)
        // Matches frontend logic: `${flightId}-${date}`
        const flightIdString = `${flightId}-${date}`;
        const flightIdHash = ethers.id(flightIdString);
        console.log(`Flight Key: ${flightIdString}`);
        console.log(`Flight ID Hash: ${flightIdHash}`);

        console.log("\nStatus Options:");
        console.log("1. ON TIME");
        console.log("2. DELAYED");
        console.log("3. CANCELLED");
        const statusInput = await ask("Select Status (1-3): ");
        const status = parseInt(statusInput, 10);

        if (![1, 2, 3].includes(status)) throw new Error("Invalid status");

        let delayMins = 0;
        if (status === 2) {
            const mins = await ask("Enter Delay in Minutes: ");
            delayMins = parseInt(mins, 10);
        }

        console.log(`\nSubmitting status for Flight ${flightId}...`);
        console.log(`Status: ${status}, Delay: ${delayMins}m`);

        // 1. Get Signature via API
        const signPayload = {
            flightIdHash: flightIdHash,
            status: status,
            delayMins: delayMins
        };

        console.log("1. Requesting Oracle Signature (Batch)...");
        const signRes = await postRequest('/sign-flight', signPayload);
        console.log("   Signature received.");

        // 2. Finalize on Chain
        const finalizePayload = {
            ...signRes.payload, // contains flightIdHash, status, etc.
            sigs: [signRes.signature]
        };

        console.log("2. Finalizing Batch Outcome on Blockchain...");
        const finalizeRes = await postRequest('/finalize-flight', finalizePayload);

        console.log("\n✅ SUCCESS!");
        console.log(`Transaction Hash: ${finalizeRes.txHash}`);
        console.log(`Outcome finalized for Flight ${flightId}.`);
        console.log("All associated insurance policies should now be settled.");

    } catch (err) {
        console.error("\n❌ ERROR:", err.message);
        if (err.message.includes("ECONNREFUSED")) {
            console.error("Make sure the backend server is running on port 8000!");
        }
    } finally {
        rl.close();
    }
}

main();
