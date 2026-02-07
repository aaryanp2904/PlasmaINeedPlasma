import { Router } from "express";
import { z } from "zod";
import { env } from "../config";
import { readClients } from "../contracts/clients";

export const readRouter = Router();

readRouter.get("/config", (_req, res) => {
  res.json({
    chainId: env.CHAIN_ID,
    rpcUrl: env.RPC_URL,
    addresses: {
      escrow: env.ESCROW_ADDRESS,
      policy: env.POLICY_ADDRESS,
      pool: env.POOL_ADDRESS,
      oracle: env.ORACLE_ADDRESS,
      token: env.TOKEN_ADDRESS,
      merchantDefault: env.DEFAULT_MERCHANT ?? null
    }
  });
});

readRouter.get("/order/:orderId", async (req, res) => {
  const { escrow } = readClients();
  const orderId = BigInt(req.params.orderId);
  const o = await escrow.orders(orderId);

  res.json({
    orderId: orderId.toString(),
    buyer: o.buyer,
    merchant: o.merchant,
    token: o.token,
    ticketPrice: o.ticketPrice.toString(),
    premium: o.premium.toString(),
    flightIdHash: o.flightIdHash,
    departTs: Number(o.departTs),
    arrivalTs: Number(o.arrivalTs),
    refundOnCancel: o.refundOnCancel,
    policyId: o.policyId.toString(),
    status: Number(o.status),
    outcomeStatus: Number(o.outcomeStatus),
    outcomeDelayMins: Number(o.outcomeDelayMins),
    createdAt: Number(o.createdAt),
    settledAt: Number(o.settledAt)
  });
});

readRouter.get("/policy/:policyId", async (req, res) => {
  const { policy } = readClients();
  const policyId = BigInt(req.params.policyId);

  const p = await policy.policies(policyId);
  const holder = await policy.ownerOf(policyId);

  res.json({
    policyId: policyId.toString(),
    holder,
    orderId: p.orderId.toString(),
    token: p.token,
    ticketPrice: p.ticketPrice.toString(),
    premium: p.premium.toString(),
    expiryTs: Number(p.expiryTs),
    settled: p.settled,
    payout: p.payout.toString()
  });
});

readRouter.get("/policy/by-order/:orderId", async (req, res) => {
  const { policy } = readClients();
  const orderId = BigInt(req.params.orderId);
  const policyId = await policy.policyIdByOrder(orderId);

  if (policyId === 0n) return res.json({ orderId: orderId.toString(), policyId: "0" });

  const p = await policy.policies(policyId);
  const holder = await policy.ownerOf(policyId);

  res.json({
    orderId: orderId.toString(),
    policyId: policyId.toString(),
    holder,
    token: p.token,
    ticketPrice: p.ticketPrice.toString(),
    premium: p.premium.toString(),
    expiryTs: Number(p.expiryTs),
    settled: p.settled,
    payout: p.payout.toString()
  });
});

const OrdersQuery = z.object({
  buyer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  fromBlock: z.string().optional()
});

readRouter.get("/orders", async (req, res) => {
  const q = OrdersQuery.parse(req.query);
  const { provider, escrow } = readClients();
  const fromBlock = q.fromBlock ? Number(q.fromBlock) : (env.DEPLOY_BLOCK ?? 0);

  const topic = escrow.interface.getEvent("OrderCreated").topicHash;
  const buyerTopic = "0x" + q.buyer.toLowerCase().slice(2).padStart(64, "0");

  const logs = await provider.getLogs({
    address: env.ESCROW_ADDRESS,
    fromBlock,
    toBlock: "latest",
    topics: [topic, null, buyerTopic]
  });

  const orders = logs.map((log) => {
    const parsed = escrow.interface.parseLog(log);
    return {
      orderId: parsed.args.orderId.toString(),
      buyer: parsed.args.buyer,
      merchant: parsed.args.merchant,
      token: parsed.args.token,
      ticketPrice: parsed.args.ticketPrice.toString(),
      premium: parsed.args.premium.toString(),
      flightIdHash: parsed.args.flightIdHash,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber
    };
  });

  res.json({ fromBlock, count: orders.length, orders });
});
