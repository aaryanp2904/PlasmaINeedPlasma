import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { env } from "../config";
import { TicketEscrowAbi, PolicyManagerAbi, InsurancePoolAbi, OracleAbi, ERC20Abi } from "./abis";

export function provider() {
  return new JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
}

export function readClients() {
  const p = provider();
  return {
    provider: p,
    escrow: new Contract(env.ESCROW_ADDRESS, TicketEscrowAbi, p),
    policy: new Contract(env.POLICY_ADDRESS, PolicyManagerAbi, p),
    pool: new Contract(env.POOL_ADDRESS, InsurancePoolAbi, p),
    oracle: new Contract(env.ORACLE_ADDRESS, OracleAbi, p),
    token: new Contract(env.TOKEN_ADDRESS, ERC20Abi, p)
  };
}

function submitterWallet() {
  const pk = env.ORACLE_SUBMITTER_PRIVATE_KEY ?? env.ORACLE_SIGNER_PRIVATE_KEY;
  if (!pk) throw new Error("Missing ORACLE_SUBMITTER_PRIVATE_KEY (or ORACLE_SIGNER_PRIVATE_KEY)");
  return new Wallet(pk, provider());
}

export function writeClients() {
  const w = submitterWallet();
  return {
    escrow: new Contract(env.ESCROW_ADDRESS, TicketEscrowAbi, w),
    oracle: new Contract(env.ORACLE_ADDRESS, OracleAbi, w),
    wallet: w
  };
}

export function oracleSignerWallet() {
  if (!env.ORACLE_SIGNER_PRIVATE_KEY) throw new Error("Missing ORACLE_SIGNER_PRIVATE_KEY");
  return new Wallet(env.ORACLE_SIGNER_PRIVATE_KEY, provider());
}
