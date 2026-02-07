import { Router } from "express";
import { z } from "zod";
import { ethers } from "ethers";
import { env } from "../config";
import { readClients } from "../contracts/clients";

export const txRouter = Router();

const CreateOrderSchema = z.object({
  buyer: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),  // if provided, we check allowance
  merchant: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  ticketPrice: z.string(), // "200.0" unless raw=true
  premium: z.string(),     // "10.0" unless raw=true
  raw: z.boolean().optional().default(false),
  flightIdHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  departTs: z.number().int(),
  arrivalTs: z.number().int(),
  refundOnCancel: z.boolean()
});

txRouter.post("/create-order", async (req, res) => {
  const body = CreateOrderSchema.parse(req.body);
  const { escrow, token: erc20 } = readClients();

  const tokenAddr = body.token ?? env.TOKEN_ADDRESS;
  const merchant = body.merchant ?? env.DEFAULT_MERCHANT;
  if (!merchant) return res.status(400).json({ error: "merchant missing (provide merchant or DEFAULT_MERCHANT)" });

  const d = env.TOKEN_DECIMALS ?? 18;
  const ticketPrice = body.raw ? BigInt(body.ticketPrice) : ethers.parseUnits(body.ticketPrice, d);
  const premium = body.raw ? BigInt(body.premium) : ethers.parseUnits(body.premium, d);
  const total = ticketPrice + premium;

  const data = escrow.interface.encodeFunctionData("createOrder", [
    merchant,
    tokenAddr,
    ticketPrice,
    premium,
    body.flightIdHash,
    body.departTs,
    body.arrivalTs,
    body.refundOnCancel
  ]);

  let approvalTx: any = null;
  let needsApproval = false;

  if (body.buyer) {
    const allowance: bigint = await erc20.allowance(body.buyer, env.ESCROW_ADDRESS);
    if (allowance < total) {
      needsApproval = true;
      const approveData = erc20.interface.encodeFunctionData("approve", [
        env.ESCROW_ADDRESS,
        total
      ]);
      approvalTx = { to: tokenAddr, data: approveData, value: "0x0" };
    }
  }

  res.json({
    approvalTx,
    tx: { to: env.ESCROW_ADDRESS, data, value: "0x0" },
    meta: {
      merchant,
      token: tokenAddr,
      ticketPrice: ticketPrice.toString(),
      premium: premium.toString(),
      decimals: d,
      needsApproval
    }
  });
});

const BuyInsuranceSchema = z.object({
  buyer: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  orderId: z.string(),
  premium: z.string(),
  raw: z.boolean().optional().default(false)
});

txRouter.post("/buy-insurance", async (req, res) => {
  const body = BuyInsuranceSchema.parse(req.body);
  const { escrow, token: erc20 } = readClients();

  const d = env.TOKEN_DECIMALS ?? 18;
  const premium = body.raw ? BigInt(body.premium) : ethers.parseUnits(body.premium, d);

  const data = escrow.interface.encodeFunctionData("buyInsurance", [
    BigInt(body.orderId),
    premium
  ]);

  let approvalTx: any = null;
  let needsApproval = false;

  if (body.buyer) {
    const allowance: bigint = await erc20.allowance(body.buyer, env.ESCROW_ADDRESS);
    if (allowance < premium) {
      needsApproval = true;
      const approveData = erc20.interface.encodeFunctionData("approve", [
        env.ESCROW_ADDRESS,
        premium
      ]);
      approvalTx = { to: env.TOKEN_ADDRESS, data: approveData, value: "0x0" };
    }
  }

  res.json({
    approvalTx,
    tx: { to: env.ESCROW_ADDRESS, data, value: "0x0" },
    meta: { premium: premium.toString(), decimals: d, needsApproval }
  });
});
