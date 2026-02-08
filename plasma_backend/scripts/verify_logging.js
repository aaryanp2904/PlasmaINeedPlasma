
async function main() {
    const url = 'http://localhost:8000/api/tx/log-order';
    const payload = {
        orderId: "12345",
        txHash: "0xabc123",
        flightDetails: {
            from: "LHR",
            to: "JFK",
            price: 100
        }
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            console.log("Logging endpoint responded OK");
        } else {
            console.log("Logging endpoint failed", await res.text());
        }
    } catch (e) {
        console.error("Fetch failed", e);
    }
}

main();
