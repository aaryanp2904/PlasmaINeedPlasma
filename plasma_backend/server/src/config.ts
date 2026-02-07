import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  RPC_URL: z.string().url(),
  CHAIN_ID: z.string().transform((s) => Number(s)),
  ESCROW_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  POLICY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  POOL_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  ORACLE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  TOKEN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  TOKEN_DECIMALS: z.string().optional().transform((s) => (s ? Number(s) : 18)),
  DEFAULT_MERCHANT: z.string().optional(),
  DEPLOY_BLOCK: z.string().optional().transform((s) => (s ? Number(s) : 0)),
  ORACLE_SIGNER_PRIVATE_KEY: z.string().optional(),
  ORACLE_SUBMITTER_PRIVATE_KEY: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
