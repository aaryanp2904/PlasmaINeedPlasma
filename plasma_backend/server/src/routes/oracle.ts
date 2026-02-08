import { Router } from "express";
import { z } from "zod";
import { env } from "../config";
import { oracleSignerWallet, provider, writeClients } from "../contracts/clients";

export const oracleRouter = Router();

const OutcomeSchema = z.object({
  orderId: z.string(),
  status: z.number().int().min(1).max(3),   // 1=on time, 2=delayed, 3=cancelled
  delayMins: z.number().int().min(0).max(1_000_000),
  reportedAt: z.number().int().optional()
});

oracleRouter.post("/sign", async (req, res) => {
  const body = OutcomeSchema.parse(req.body);
  const signer = oracleSignerWallet();
  const p = provider();
  const net = await p.getNetwork();

  const reportedAt = body.reportedAt ?? (await p.getBlock("latest")).timestamp;
  const delayMins = body.status === 2 ? body.delayMins : 0;

  const domain = {
    name: "FlightOutcomeOracle",
    version: "1",
    chainId: Number(net.chainId),
    verifyingContract: env.ORACLE_ADDRESS
  };

  const types = {
    Outcome: [
      { name: "orderId", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "delayMins", type: "uint32" },
      { name: "reportedAt", type: "uint40" }
    ]
  };

  const value = {
    orderId: BigInt(body.orderId),
    status: body.status,
    delayMins,
    reportedAt
  };

  const sig = await signer.signTypedData(domain, types as any, value as any);

  res.json({
    signer: await signer.getAddress(),
    signature: sig,
    payload: {
      ...value,
      orderId: value.orderId.toString()
    }
  });
});

const FinalizeSchema = OutcomeSchema.extend({
  sigs: z.array(z.string().regex(/^0x[a-fA-F0-9]+$/)).min(1)
});

oracleRouter.post("/finalize", async (req, res) => {
  const body = FinalizeSchema.parse(req.body);
  const { oracle } = writeClients();
  const p = provider();

  const reportedAt = body.reportedAt ?? (await p.getBlock("latest")).timestamp;
  const delayMins = body.status === 2 ? body.delayMins : 0;

  const tx = await oracle.finalizeOutcome(
    BigInt(body.orderId),
    body.status,
    delayMins,
    reportedAt,
    body.sigs
  );

  const receipt = await tx.wait();

  res.json({
    txHash: receipt?.hash ?? tx.hash,
    orderId: body.orderId,
    status: body.status,
    delayMins,
    reportedAt
  });
});

const FlightOutcomeSchema = z.object({
  flightIdHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  status: z.number().int().min(1).max(3),
  delayMins: z.number().int().min(0).max(1_000_000),
  reportedAt: z.number().int().optional()
});

oracleRouter.post("/sign-flight", async (req, res) => {
  const body = FlightOutcomeSchema.parse(req.body);
  const signer = oracleSignerWallet();
  const p = provider();
  const net = await p.getNetwork();

  const reportedAt = body.reportedAt ?? (await p.getBlock("latest")).timestamp;
  const delayMins = body.status === 2 ? body.delayMins : 0;

  const domain = {
    name: "FlightOutcomeOracle",
    version: "1",
    chainId: Number(net.chainId),
    verifyingContract: env.ORACLE_ADDRESS
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
    flightIdHash: body.flightIdHash,
    status: body.status,
    delayMins,
    reportedAt
  };

  const sig = await signer.signTypedData(domain, types as any, value as any);

  res.json({
    signer: await signer.getAddress(),
    signature: sig,
    payload: value
  });
});

const FinalizeFlightSchema = FlightOutcomeSchema.extend({
  sigs: z.array(z.string().regex(/^0x[a-fA-F0-9]+$/)).min(1)
});

oracleRouter.post("/finalize-flight", async (req, res) => {
  const body = FinalizeFlightSchema.parse(req.body);
  const { oracle } = writeClients();
  const p = provider();

  const reportedAt = body.reportedAt ?? (await p.getBlock("latest")).timestamp;
  const delayMins = body.status === 2 ? body.delayMins : 0;

  console.log(`[ORACLE] Finalizing flight outcome for ${body.flightIdHash}`);

  const tx = await oracle.finalizeFlightOutcome(
    body.flightIdHash,
    body.status,
    delayMins,
    reportedAt,
    body.sigs
  );

  const receipt = await tx.wait();

  res.json({
    txHash: receipt?.hash ?? tx.hash,
    flightIdHash: body.flightIdHash,
    status: body.status,
    delayMins,
    reportedAt
  });
});

// Force reload timestamp: 123456789
