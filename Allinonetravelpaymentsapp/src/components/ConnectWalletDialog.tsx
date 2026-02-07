import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Globe, Shield, Sparkles, Wallet, X } from 'lucide-react';
import { motion } from 'motion/react';

type WalletOption = {
  id: string;
  name: string;
  description: string;
  tag?: string;
  accent: string;
  enabled?: boolean;
};

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Browser extension and mobile app',
    tag: 'Popular',
    accent: 'from-amber-500 to-orange-500',
    enabled: true,
  },
];

interface ConnectWalletDialogProps {
  triggerClassName?: string;
  triggerLabel?: string;
}

type EthereumRequest = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type EthereumProvider = {
  isMetaMask?: boolean;
  request: (args: EthereumRequest) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const PLASMA_MAINNET = {
  chainId: '0x2611', // 9745
  chainName: 'Plasma Mainnet Beta',
  nativeCurrency: {
    name: 'XPL',
    symbol: 'XPL',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.plasma.to'],
  blockExplorerUrls: ['https://plasmascan.to/'],
};

export function ConnectWalletDialog({
  triggerClassName = '',
  triggerLabel = 'Connect Wallet',
}: ConnectWalletDialogProps) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const shortAccount = useMemo(() => {
    if (!account) return null;
    return `${account.slice(0, 6)}...${account.slice(-4)}`;
  }, [account]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;

    const handleAccounts = (accounts: string[]) => {
      setAccount(accounts?.[0] ?? null);
    };
    const handleChain = (nextChainId: string) => {
      setChainId(nextChainId);
    };

    provider
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => handleAccounts(accounts))
      .catch(() => undefined);
    provider
      .request({ method: 'eth_chainId' })
      .then((id: string) => handleChain(id))
      .catch(() => undefined);

    provider.on?.('accountsChanged', handleAccounts);
    provider.on?.('chainChanged', handleChain);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccounts);
      provider.removeListener?.('chainChanged', handleChain);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (account) {
      window.localStorage.setItem('plasma_wallet', account);
    } else {
      window.localStorage.removeItem('plasma_wallet');
    }
  }, [account]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (chainId) {
      window.localStorage.setItem('plasma_chainId', chainId);
    }
  }, [chainId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const ensurePlasmaNetwork = async (provider: EthereumProvider) => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: PLASMA_MAINNET.chainId }],
      });
      setChainId(PLASMA_MAINNET.chainId);
    } catch (switchError: any) {
      const code = switchError?.code ?? switchError?.data?.originalError?.code;
      if (code === 4902 || `${switchError?.message ?? ''}`.includes('Unrecognized')) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [PLASMA_MAINNET],
        });
        setChainId(PLASMA_MAINNET.chainId);
      } else {
        throw switchError;
      }
    }
  };

  const connectMetaMask = async () => {
    const provider = window.ethereum;
    if (!provider || !provider.isMetaMask) {
      setStatus('error');
      setMessage('MetaMask not detected. Install the extension to continue.');
      return;
    }

    setStatus('connecting');
    setMessage(null);
    try {
      const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
      setAccount(accounts?.[0] ?? null);
      await ensurePlasmaNetwork(provider);
      setStatus('connected');
      setMessage('Connected to Plasma Mainnet Beta.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message ?? 'Unable to connect. Please try again.');
    }
  };

  const handleWalletClick = async (wallet: WalletOption) => {
    if (wallet.id === 'metamask') {
      await connectMetaMask();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={[
          'px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-slate-300 transition-all shadow-sm',
          triggerClassName,
        ].join(' ')}
      >
        {shortAccount ? `Connected: ${shortAccount}` : triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            role="presentation"
            onClick={() => setOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Connect wallet"
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-600 transition hover:text-slate-900"
              aria-label="Close connect wallet dialog"
            >
              <X className="h-4 w-4" />
            </button>

        <div className="grid md:grid-cols-[1.05fr_1.4fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-6 text-white">
            <motion.div
              className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-2xl"
              animate={{ y: [0, 12, 0], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-sky-400/30 blur-3xl"
              animate={{ y: [0, -10, 0], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="text-left relative z-10">
              <h2 className="text-2xl font-semibold text-white">Connect your wallet</h2>
              <p className="text-blue-100 text-sm">
                Choose a wallet to continue. We never move funds without your approval.
              </p>
            </div>

            <div className="mt-8 space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="font-medium">Non-custodial</p>
                  <p className="text-sm text-blue-100">You control your keys</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="font-medium">EVM compatible</p>
                  <p className="text-sm text-blue-100">Works across major networks</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="font-medium">Instant confirmations</p>
                  <p className="text-sm text-blue-100">Optimized for Plasma</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-600">Select a wallet</p>
              <span className="text-xs text-slate-500">MetaMask required</span>
            </div>

            <div className="space-y-3">
              {WALLET_OPTIONS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletClick(wallet)}
                  className="group w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-all flex items-center gap-4 hover:border-blue-300 hover:shadow-md"
                  type="button"
                >
                  <span
                    className={[
                      'h-12 w-12 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-sm',
                      wallet.accent,
                    ].join(' ')}
                  >
                    <Wallet className="h-5 w-5" />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{wallet.name}</span>
                      {wallet.tag && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {wallet.tag}
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-slate-500">{wallet.description}</span>
                  </span>
                  <span className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Secure connection</p>
                  <p className="text-xs text-slate-500">
                    We only request the permissions needed to complete your booking.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Network: Plasma Mainnet Beta</span>
              <span className={chainId === PLASMA_MAINNET.chainId ? 'text-green-600' : 'text-amber-600'}>
                {chainId === PLASMA_MAINNET.chainId ? 'Plasma connected' : 'Switching required'}
              </span>
            </div>

            {status !== 'idle' && message && (
              <div
                className={[
                  'mt-3 rounded-lg px-3 py-2 text-xs border',
                  status === 'connected'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : status === 'connecting'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700',
                ].join(' ')}
              >
                {message}
              </div>
            )}
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
