import React, { useMemo, useState } from 'react';
import { ArrowLeft, Shield, Info, Check, ExternalLink, Clock, Wallet, Plane } from 'lucide-react';
import { motion } from 'motion/react';

interface CheckoutProps {
  booking: any;
  searchParams: any;
  onBack: () => void;
  onComplete: (confirmation: any) => void;
}

function formatDuration(duration: string): string {
  if (!duration) return '';
  if (duration.startsWith('PT')) {
    const h = duration.match(/(\d+)H/)?.[1];
    const m = duration.match(/(\d+)M/)?.[1];
    const parts: string[] = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return parts.join(' ');
  }

  const h = duration.match(/(\d+)\s*h/i)?.[1];
  const m = duration.match(/(\d+)\s*m/i)?.[1];
  if (h || m) {
    return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
  }

  return duration;
}

export function Checkout({ booking, searchParams, onBack, onComplete }: CheckoutProps) {
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'USDC' | 'USDT' | 'DAI'>('USDC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const carrierName = booking?.carrierName ?? booking?.carrier ?? 'Airline';
  const bookingId = useMemo(() => {
    const base = String(booking?.id ?? 'FL').replace(/\s+/g, '').toUpperCase();
    const datePart = String(searchParams?.date ?? '').replace(/-/g, '') || 'DATE';
    const rand =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
        : Math.random().toString(36).slice(2, 10).toUpperCase();
    const shortBase = base.slice(-6) || 'FLIGHT';
    return `${shortBase}-${datePart}-${rand}`;
  }, [booking?.id, searchParams?.date]);

  const insuranceFee = 12;
  const platformFee = 5;
  const baseFare = booking.price * searchParams.passengers;
  const totalAmount = baseFare + platformFee + (insuranceEnabled ? insuranceFee : 0);

  const buildFakeTxHash = () => {
    const chars = '0123456789abcdef';
    let out = '0x';
    for (let i = 0; i < 64; i += 1) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  };

  const getStoredWallet = () => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('plasma_wallet');
  };

  const getStoredChainId = () => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('plasma_chainId');
  };

  const handlePayment = () => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      const chainIdRaw = getStoredChainId();
      const parsedChainId = chainIdRaw
        ? Number.parseInt(chainIdRaw, chainIdRaw.startsWith('0x') ? 16 : 10)
        : undefined;
      const confirmation = {
        id: bookingId,
        carrierName: booking.carrierName ?? booking.carrier,
        carrierCode: booking.carrierCode ?? null,
        carrier: booking.carrier,
        origin: booking.origin ?? searchParams.from,
        destination: booking.destination ?? searchParams.to,
        date: booking.date ?? searchParams.date,
        departure: booking.departure,
        arrival: booking.arrival,
        duration: booking.duration,
        price: Number.isFinite(totalAmount) ? totalAmount : booking.price,
        passengers: searchParams.passengers,
        direct: booking.direct ?? true,
        currency: selectedCurrency,
        txHash: buildFakeTxHash(),
        chainId: parsedChainId,
        payer: getStoredWallet() ?? undefined,
        insuranceEnabled,
        status: 'confirmed',
      };
      onComplete(confirmation);
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to results
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Flight Details */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Flight Details</h2>
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              >
                <Plane className="w-5 h-5 text-white" />
              </motion.div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Carrier</p>
                  <p className="font-medium text-slate-900">{carrierName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Booking ID</p>
                  <p className="font-medium text-slate-900">{bookingId}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <p className="text-sm text-slate-500 mb-1">From</p>
                  <p className="font-medium text-slate-900">{searchParams.from}</p>
                  <p className="text-sm text-slate-600 mt-1">{booking.departure}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">To</p>
                  <p className="font-medium text-slate-900">{searchParams.to}</p>
                  <p className="text-sm text-slate-600 mt-1">{booking.arrival}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Date</p>
                  <p className="font-medium text-slate-900">{searchParams.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Duration</p>
                  <p className="font-medium text-slate-900">{formatDuration(booking.duration)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Passengers</p>
                  <p className="font-medium text-slate-900">{searchParams.passengers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Insurance */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Flight Insurance</h3>
                  <p className="text-sm text-slate-600">
                    Automatic on-chain payouts for delays & cancellations
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setInsuranceEnabled(!insuranceEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  insuranceEnabled ? 'bg-green-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    insuranceEnabled ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {insuranceEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Delay over 2 hours: 50 USDC auto-payout</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Cancellation: Full refund + 25 USDC</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Baggage delay: 30 USDC compensation</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-green-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Insurance Premium</span>
                  <span className="font-semibold text-slate-900">{insuranceFee} USDC</span>
                </div>
              </motion.div>
            )}

            <button
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info className="w-4 h-4" />
              How does automatic payout work?
            </button>

            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-slate-700"
              >
                Smart contracts monitor flight status via oracles. If conditions are met,
                compensation is automatically sent to your wallet within minutes. No claims needed.
              </motion.div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Payment Method</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {(['USDC', 'USDT', 'DAI'] as const).map((currency) => (
                <button
                  key={currency}
                  onClick={() => setSelectedCurrency(currency)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedCurrency === currency
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-semibold text-sm">{currency.charAt(0)}</span>
                  </div>
                  <p className="font-medium text-slate-900 text-center">{currency}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              <Wallet className="w-4 h-4" />
              <span>Wallet: 0x742d...8f3a</span>
              <span className="ml-auto text-green-600">Connected</span>
            </div>
          </div>
        </div>

        {/* Right Column - Price Breakdown */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 sticky top-24">
            <h3 className="font-semibold text-slate-900 mb-6">Payment Breakdown</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between text-slate-700">
                <span>Base Fare</span>
                <span>{booking.price} × {searchParams.passengers}</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span>Subtotal</span>
                <span>{baseFare} {selectedCurrency}</span>
              </div>
              
              <div className="h-px bg-slate-200" />
              
              <div className="flex items-center justify-between text-slate-700">
                <span>Platform Fee</span>
                <span>{platformFee} {selectedCurrency}</span>
              </div>
              
              {insuranceEnabled && (
                <div className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>Flight Insurance</span>
                  </div>
                  <span>{insuranceFee} {selectedCurrency}</span>
                </div>
              )}
              
              <div className="h-px bg-slate-200" />
              
              <div className="flex items-center justify-between text-lg font-bold text-slate-900">
                <span>Total Amount</span>
                <span>{totalAmount} {selectedCurrency}</span>
              </div>
            </div>

            {/* On-Chain Breakdown */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-900">On-Chain Split</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-700">
                  <span>→ Carrier</span>
                  <span className="font-medium">{baseFare} {selectedCurrency}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>→ Platform Treasury</span>
                  <span className="font-medium">{platformFee} {selectedCurrency}</span>
                </div>
                {insuranceEnabled && (
                  <div className="flex justify-between text-slate-700">
                    <span>→ Insurance Pool</span>
                    <span className="font-medium">{insuranceFee} {selectedCurrency}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay {totalAmount} {selectedCurrency}
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="mt-4 text-xs text-center text-slate-500">
              Transaction secured by Plasma Network
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
