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
  // Use values from request body
  const ticketPrice = body.raw ? BigInt(body.ticketPrice) : ethers.parseUnits(body.ticketPrice, d);
  const premium = body.raw ? BigInt(body.premium) : ethers.parseUnits(body.premium, d);
  const total = ticketPrice + premium;

  console.log(`[API] create-order request received:
    - Buyer: ${body.buyer || 'N/A'}
    - Merchant: ${merchant}
    - Token: ${tokenAddr}
    - Ticket Price: ${ticketPrice.toString()} (raw: ${body.ticketPrice})
    - Premium: ${premium.toString()} (raw: ${body.premium})
    - Flight Hash: ${body.flightIdHash}
    - Departure: ${new Date(body.departTs * 1000).toISOString()} (${body.departTs})
    - Arrival: ${new Date(body.arrivalTs * 1000).toISOString()} (${body.arrivalTs})
    - RefundOnCancel: ${body.refundOnCancel}
  `);

  console.log(`[CONTRACT] Encoding createOrder for flightIdHash=${body.flightIdHash}`);
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
  console.log(`[CONTRACT] createOrder encoded data length: ${data.length}`);

  let approvalTx: any = null;
  let needsApproval = false;

  if (body.buyer) {
    console.log(`[CONTRACT] Checking allowance for buyer=${body.buyer} token=${tokenAddr}`);
    const allowance: bigint = await erc20.allowance(body.buyer, env.ESCROW_ADDRESS);
    console.log(`[CONTRACT] Allowance: ${allowance}, Required: ${total}`);
    if (allowance < total) {
      console.log(`[CONTRACT] Allowance insufficient. Encoding approve for ${total}`);
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

  console.log(`[CONTRACT] Encoding buyInsurance for orderId=${body.orderId} premium=${premium}`);
  const data = escrow.interface.encodeFunctionData("buyInsurance", [
    BigInt(body.orderId),
    premium
  ]);

  let approvalTx: any = null;
  let needsApproval = false;

  if (body.buyer) {
    console.log(`[CONTRACT] Checking allowance for buyer=${body.buyer} at ${env.TOKEN_ADDRESS}`);
    const allowance: bigint = await erc20.allowance(body.buyer, env.ESCROW_ADDRESS);
    console.log(`[CONTRACT] Allowance: ${allowance}, Required: ${premium}`);
    if (allowance < premium) {
      console.log(`[CONTRACT] Allowance insufficient. Encoding approve for ${premium}`);
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
