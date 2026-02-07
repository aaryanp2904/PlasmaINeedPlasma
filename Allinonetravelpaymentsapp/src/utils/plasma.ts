import { ethers } from 'ethers';

const API_BASE = 'http://localhost:8000/api';

export interface PlasmaConfig {
  chainId: string;
  rpcUrl: string;
  addresses: {
    escrow: string;
    policy: string;
    pool: string;
    oracle: string;
    token: string;
    merchantDefault: string | null;
  };
}

export interface OrderDetails {
  orderId: string;
  policyId: string;
  buyer: string;
  merchant: string;
  token: string;
  ticketPrice: string;
  premium: string;
  flightIdHash: string;
  departTs: number;
  arrivalTs: number;
  refundOnCancel: boolean;
  status: number;
  outcomeStatus: number;
  outcomeDelayMins: number;
  createdAt: number;
  settledAt: number;
}

export interface PolicyDetails {
  orderId: string;
  policyId: string;
  holder: string;
  token: string;
  ticketPrice: string;
  premium: string;
  expiryTs: number;
  settled: boolean;
  payout: string;
}

export async function getPlasmaConfig(): Promise<PlasmaConfig> {
  const res = await fetch(`${API_BASE}/read/config`);
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function getOrderDetails(orderId: string): Promise<OrderDetails> {
  const res = await fetch(`${API_BASE}/read/order/${orderId}`);
  if (!res.ok) throw new Error('Failed to fetch order');
  return res.json();
}

export async function getPolicyByOrder(orderId: string): Promise<PolicyDetails> {
  const res = await fetch(`${API_BASE}/read/policy/by-order/${orderId}`);
  if (!res.ok) throw new Error('Failed to fetch policy');
  return res.json();
}

export async function createOrderTransaction(
  provider: ethers.BrowserProvider,
  buyerAddress: string,
  orderDetails: {
    ticketPrice: string;
    premium: string;
    flightIdHash: string;
    departTs: number;
    arrivalTs: number;
    refundOnCancel: boolean;
    merchant?: string;
    token?: string;
  }
) {
  // 1. Get Config
  const config = await getPlasmaConfig();

  // Debug: Check balance
  const tokenContract = new ethers.Contract(
    orderDetails.token || config.addresses.token,
    ["function balanceOf(address) view returns (uint256)", "function symbol() view returns (string)"],
    provider
  );
  const bal = await tokenContract.balanceOf(buyerAddress);
  const symbol = await tokenContract.symbol();
  console.log(`[DEBUG] User Balance: ${ethers.formatUnits(bal, 18)} ${symbol}`);

  // 2. Call backend to construct TX data
  const res = await fetch(`${API_BASE}/tx/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyer: buyerAddress,
      merchant: orderDetails.merchant,
      token: orderDetails.token,
      ticketPrice: orderDetails.ticketPrice,
      premium: orderDetails.premium,
      flightIdHash: orderDetails.flightIdHash,
      departTs: orderDetails.departTs,
      arrivalTs: orderDetails.arrivalTs,
      refundOnCancel: orderDetails.refundOnCancel,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Order creation preparation failed: ${err}`);
  }

  const { approvalTx, tx } = await res.json();
  const signer = await provider.getSigner();

  // 3. Handle Approval if needed
  if (approvalTx) {
    // console.log("Sending approval...", approvalTx);
    const approveResp = await signer.sendTransaction(approvalTx);
    await approveResp.wait();
    // console.log("Approval confirmed");
  }

  // 4. Send Create Order TX
  // console.log("Sending create order...", tx);
  const createResp = await signer.sendTransaction(tx);
  const receipt = await createResp.wait();

  // 5. Parse logs to find OrderCreated event
  if (!receipt) throw new Error("Transaction failed");

  // We need the topic for OrderCreated
  // event OrderCreated(uint256 indexed orderId, ...);
  // The first topic is the event signature hash. The second topic is orderId (indexed).
  // We can look for the log emitted by the Escrow address.

  const escrowLog = receipt.logs.find(
    (l) => l.address.toLowerCase() === config.addresses.escrow.toLowerCase()
  );

  if (!escrowLog) {
    // Check if we can find it by topic if address check fails (e.g. proxy) or just assume first log if simple
    throw new Error("OrderCreated event not found in logs");
  }

  // orderId is the first indexed argument (topic[1])
  const orderIdHex = escrowLog.topics[1];
  const orderId = BigInt(orderIdHex).toString();

  return { orderId, txHash: receipt.hash };
}

const PLASMA_CHAIN_ID_HEX = '0x2612'; // 9746

async function switchNetwork(provider: ethers.BrowserProvider) {
  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: PLASMA_CHAIN_ID_HEX }]);
  } catch (switchError: any) {
    // This error code 4902 indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      try {
        await provider.send("wallet_addEthereumChain", [
          {
            chainId: PLASMA_CHAIN_ID_HEX,
            chainName: "Plasma Testnet",
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: ["https://testnet-rpc.plasma.to"],
          },
        ]);
      } catch (addError) {
        throw new Error("Failed to add Plasma Testnet to wallet.");
      }
    } else {
      throw switchError;
    }
  }
}

export async function connectWallet() {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No crypto wallet found. Please install MetaMask.");
  }
  const provider = new ethers.BrowserProvider((window as any).ethereum);

  // Request accounts first (unlocks the wallet)
  await provider.send("eth_requestAccounts", []);

  // Switch to Plasma Testnet
  await switchNetwork(provider);

  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
}
