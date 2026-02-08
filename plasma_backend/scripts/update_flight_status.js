
const readline = require('readline');
// We use dynamic import for node-fetch or standard http if needed, but for simplicity in this environment we'll use standard http or assume fetch is available (Node 18+).
// If Node version is old, we might need a helper. The previous script failed on require('node-fetch').
// Let's use native fetch if available, or https/http module. 
// Since we are in an environment where 'node-fetch' might not be installed, we will use the 'http' module.

const http = require('http');

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
    console.log("=== Flight Outcome Oracle Simulator ===");

    try {
        const orderId = await ask("Enter Order ID: ");
        if (!orderId) throw new Error("Order ID is required");

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

        console.log(`\nSubmitting status for Order ${orderId}...`);
        console.log(`Status: ${status}, Delay: ${delayMins}m`);

        // 1. Get Signature via API (Assuming backend owner is the oracle)
        // In production, the oracle service would do this autonomously.
        // Here we use the backend endpoint that signs with the stored oracle key.

        // Note: The /sign endpoint takes { orderId, status, delayMins }
        const signPayload = {
            orderId: orderId,
            status: status,
            delayMins: delayMins
        };

        console.log("1. Requesting Oracle Signature...");
        const signRes = await postRequest('/sign', signPayload);
        console.log("   Signature received.");

        // 2. Finalize on Chain
        // The finalize endpoint takes the sign payload + signature array
        const finalizePayload = {
            ...signRes.payload, // contains orderId, status, delayMins, reportedAt
            sigs: [signRes.signature]
        };

        console.log("2. Finalizing Outcome on Blockchain...");
        const finalizeRes = await postRequest('/finalize', finalizePayload);

        console.log("\n✅ SUCCESS!");
        console.log(`Transaction Hash: ${finalizeRes.txHash}`);
        console.log(`Outcome finalized for Order ${orderId}.`);
        if (status === 2 && delayMins >= 45) {
            console.log(">> Insurance Payout should be triggered.");
        } else if (status === 3) {
            console.log(">> Refund/Payout should be triggered.");
        }

    } catch (err) {
        console.error("\n❌ ERROR:", err.message);
    } finally {
        rl.close();
    }
}

main();
