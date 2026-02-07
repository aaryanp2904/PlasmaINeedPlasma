// server/scripts/smoke-test.js
// Run: node scripts/smoke-test.js
// Requires Node 18+ (global fetch)

const BASE = process.env.BASE_URL || "http://localhost:8080";

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!r.ok) throw new Error(`${path} -> ${r.status}\n${text}`);
  return json;
}

async function main() {
  console.log("Pinging:", BASE);

  const health = await get("/health");
  console.log("✅ /health:", health);

  const cfg = await get("/api/read/config");
  console.log("✅ /api/read/config:");
  console.log(cfg);

  // Optional: if you know an orderId exists, set ORDER_ID=1 etc.
  if (process.env.ORDER_ID) {
    const order = await get(`/api/read/order/${process.env.ORDER_ID}`);
    console.log(`✅ /api/read/order/${process.env.ORDER_ID}:`);
    console.log(order);
  }

  console.log("✅ Smoke test passed.");
}

main().catch((e) => {
  console.error("❌ Smoke test failed:");
  console.error(e.message || e);
  process.exit(1);
});
