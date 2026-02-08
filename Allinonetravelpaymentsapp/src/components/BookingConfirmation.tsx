import React from 'react';
import { CheckCircle2, Copy, ExternalLink, QrCode, Shield, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';

type BookingInput = {
  id: string;
  carrierName?: string;
  carrierCode?: string | null;
  carrier?: string;
  origin: string;
  destination: string;
  date: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  passengers: number;
  direct: boolean;
  currency?: string;
  txHash?: string;
  chainId?: number;
  payer?: string;
  insuranceEnabled?: boolean;
  status?: string;
  addresses?: {
    merchant?: string;
    token?: string;
    escrow?: string;
  };
};

type ConfirmationProps = {
  booking: BookingInput;
  onBackToHome?: () => void;
  plasmaExplorerBaseUrl?: string;
};

function shortAddr(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(dt: string) {
  const parsed = new Date(dt.includes(' ') ? dt.replace(' ', 'T') : dt);
  if (Number.isNaN(parsed.getTime())) return dt;
  return parsed.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(duration: string) {
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

function safeJsonStringify(obj: any) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function makeBookingRef() {
  return `PLS-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export function BookingConfirmation({
  booking,
  onBackToHome,
  plasmaExplorerBaseUrl = 'https://explorer.plasma.xyz/tx/',
}: ConfirmationProps) {
  const [bookingRef] = React.useState(() => makeBookingRef());
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [copied, setCopied] = React.useState<null | 'ref' | 'tx'>(null);

  const explorerUrl = booking.txHash ? `${plasmaExplorerBaseUrl}${booking.txHash}` : null;
  const currency = booking.currency ?? 'USDC';

  const qrPayload = React.useMemo(() => {
    const payload = {
      type: 'PLASMA_TRAVEL_TICKET',
      ref: bookingRef,
      offerId: booking.id,
      carrier: booking.carrierName ?? booking.carrier ?? booking.carrierCode ?? 'AIRLINE',
      route: `${booking.origin}-${booking.destination}`,
      date: booking.date,
      pax: booking.passengers,
      amount: booking.price,
      currency,
      txHash: booking.txHash ?? null,
      payer: booking.payer ?? null,
      issuedAt: new Date().toISOString(),
    };
    return safeJsonStringify(payload);
  }, [booking, bookingRef, currency]);

  React.useEffect(() => {
    let cancelled = false;

    async function gen() {
      try {
        const url = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 280,
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl('');
      }
    }

    gen();
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  async function copy(text: string, which: 'ref' | 'tx') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pt-10 pb-16">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="text-sm text-slate-500 flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Ticket QR
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Booking confirmed</h1>
            <p className="text-slate-600">
              Your payment settled instantly on Plasma. Your ticket and receipt are ready.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500">Booking ref</span>
                <span className="font-semibold text-slate-900">{bookingRef}</span>
                <button
                  onClick={() => copy(bookingRef, 'ref')}
                  className="ml-1 p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                  title="Copy booking ref"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copied === 'ref' && <span className="text-xs text-green-600">Copied</span>}
              </div>

              {booking.txHash && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500">Tx</span>
                  <span className="font-mono text-sm text-slate-900">{booking.txHash.slice(0, 10)}...</span>
                  <button
                    onClick={() => copy(booking.txHash!, 'tx')}
                    className="ml-1 p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                    title="Copy tx hash"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                      title="Open in explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {copied === 'tx' && <span className="text-xs text-green-600">Copied</span>}
                </div>
              )}

              {booking.payer && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500">Wallet</span>
                  <span className="font-medium text-slate-900">{shortAddr(booking.payer)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Ticket QR code" className="w-[180px] h-[180px]" />
              ) : (
                <div className="w-[180px] h-[180px] grid place-items-center text-slate-500">
                  Generating...
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500 text-center">Scan at gate / conductor</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Trip details</h2>

          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm text-slate-500">From</p>
              <p className="text-2xl font-bold text-slate-900">{booking.origin}</p>
              <p className="text-sm text-slate-600 mt-1">{formatTime(booking.departure)}</p>
            </div>

            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <div className="text-center">
                <p className="text-xs text-slate-500">Duration</p>
                <p className="text-sm font-medium text-slate-900">{formatDuration(booking.duration)}</p>
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-500">To</p>
              <p className="text-2xl font-bold text-slate-900">{booking.destination}</p>
              <p className="text-sm text-slate-600 mt-1">{formatTime(booking.arrival)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
              {booking.direct ? 'Direct' : 'Stops possible'}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
              Passengers: <span className="font-medium text-slate-900">{booking.passengers}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
              Carrier:{' '}
              <span className="font-medium text-slate-900">
                {booking.carrierName ?? booking.carrier ?? booking.carrierCode ?? 'Airline'}
              </span>
            </span>
          </div>

          <div className="mt-6 md:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm inline-block">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Ticket QR code" className="w-[220px] h-[220px]" />
              ) : (
                <div className="w-[220px] h-[220px] grid place-items-center text-slate-500">
                  Generating...
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500 text-center">Scan at gate / conductor</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Amount</span>
              <span className="font-semibold text-slate-900">{booking.price.toFixed(2)} {currency}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Network</span>
              <span className="font-medium text-slate-900">Plasma</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Settlement</span>
              <span className="font-medium text-green-700">Instant</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">On-chain receipt</p>
                <p className="text-sm text-slate-600">
                  Your booking reference and payment proof are encoded in the QR ticket for easy verification.
                </p>
              </div>
            </div>
          </div>

          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
            >
              View transaction
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {booking.addresses && (
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Contract Details</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Merchant</p>
              <div className="font-mono bg-slate-50 p-2 rounded-lg text-slate-700 break-all select-all">
                {booking.addresses.merchant}
              </div>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Buyer</p>
              <div className="font-mono bg-slate-50 p-2 rounded-lg text-slate-700 break-all select-all">
                {booking.payer}
              </div>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Token (mUSD)</p>
              <div className="font-mono bg-slate-50 p-2 rounded-lg text-slate-700 break-all select-all">
                {booking.addresses.token}
              </div>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Escrow Contract</p>
              <div className="font-mono bg-slate-50 p-2 rounded-lg text-slate-700 break-all select-all">
                {booking.addresses.escrow}
              </div>
            </div>
            {booking.id && (
              <div>
                <p className="text-slate-500 mb-1">Order ID</p>
                <div className="font-mono bg-slate-50 p-2 rounded-lg text-slate-700 break-all select-all">
                  {booking.id}
                </div>
              </div>
            )}
            <div>
              <p className="text-slate-500 mb-1">Policy ID</p>
              <div className="font-mono bg-slate-50 p-2 rounded-lg text-slate-700 break-all select-all">
                {(booking as any).policyId || "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBackToHome}
          className="px-5 py-3 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-900 font-medium transition-colors"
        >
          Book another trip
        </button>

        <button
          onClick={() => copy(qrPayload, 'ref')}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          Copy ticket payload
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Demo note: This QR encodes a signed-ish ticket payload (booking ref + offer + tx hash). In production, you would
        include a backend signature and verify it on scan.
      </p>
    </div>
  );
}
