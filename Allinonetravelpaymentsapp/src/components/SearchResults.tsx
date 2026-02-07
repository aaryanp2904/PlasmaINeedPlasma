import React from 'react';
import { Clock, Zap, ArrowRight, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface SearchParams {
  from: string; // e.g. "London Heathrow (LHR)" or "LHR"
  to: string;   // e.g. "New York (JFK)" or "JFK"
  date: string; // ideally "YYYY-MM-DD"
  passengers: number;
  transportType: 'flight';
}

interface SearchResultsProps {
  searchParams: SearchParams;
  onSelect: (booking: any) => void;
  onBack: () => void;
}

type Offer = {
  id: string;
  carrier: string;        // e.g. "AA" or "BA" or "Frontier Airlines"
  departure: string;      // backend returns "YYYY-MM-DD HH:MM:SS" or ISO string
  arrival: string;
  duration: string;       // e.g. "PT5H15M"
  price: number;
  direct: boolean;
  seats?: number | null;
};

// --- Airline hardcode mapping (good enough for hackathon) ---
const AIRLINE_NAME: Record<string, string> = {
  // US
  AA: 'American Airlines',
  DL: 'Delta Air Lines',
  UA: 'United Airlines',
  WN: 'Southwest',
  B6: 'JetBlue',
  AS: 'Alaska Airlines',
  NK: 'Spirit Airlines',
  F9: 'Frontier Airlines',

  // UK / EU
  BA: 'British Airways',
  VS: 'Virgin Atlantic',
  U2: 'easyJet',
  FR: 'Ryanair',
  VY: 'Vueling',
  IB: 'Iberia',
  AF: 'Air France',
  KL: 'KLM',
  LH: 'Lufthansa',
  LX: 'SWISS',
  OS: 'Austrian',
  SK: 'SAS',
  TP: 'TAP Air Portugal',
  AZ: 'ITA Airways',
  EI: 'Aer Lingus',
  AY: 'Finnair',

  // Middle East / Asia
  EK: 'Emirates',
  QR: 'Qatar Airways',
  EY: 'Etihad',
  TK: 'Turkish Airlines',
  SQ: 'Singapore Airlines',
  CX: 'Cathay Pacific',
  NH: 'ANA',
  JL: 'Japan Airlines',
  QF: 'Qantas',
  AI: 'Air India',
};

// Simple “logo” system without external assets:
// Use a tiny circular badge with the airline code.
// If you *do* want image logos, see the note at the bottom.
const AIRLINE_STYLE: Record<
  string,
  { gradient: string; ring: string }
> = {
  AA: { gradient: 'from-red-500 to-orange-500', ring: 'ring-red-200' },
  DL: { gradient: 'from-indigo-500 to-blue-500', ring: 'ring-blue-200' },
  UA: { gradient: 'from-sky-500 to-indigo-500', ring: 'ring-sky-200' },
  BA: { gradient: 'from-blue-600 to-indigo-700', ring: 'ring-blue-200' },
  VS: { gradient: 'from-fuchsia-500 to-pink-500', ring: 'ring-pink-200' },
  EK: { gradient: 'from-red-600 to-rose-600', ring: 'ring-rose-200' },
  QR: { gradient: 'from-purple-600 to-fuchsia-600', ring: 'ring-purple-200' },
  LH: { gradient: 'from-blue-800 to-slate-700', ring: 'ring-slate-200' },
  AF: { gradient: 'from-blue-500 to-red-500', ring: 'ring-blue-200' },
  KL: { gradient: 'from-sky-500 to-cyan-500', ring: 'ring-cyan-200' },
  FR: { gradient: 'from-blue-700 to-yellow-500', ring: 'ring-yellow-200' },
  U2: { gradient: 'from-orange-500 to-amber-500', ring: 'ring-amber-200' },
  F9: { gradient: 'from-green-500 to-emerald-500', ring: 'ring-emerald-200' },
  NK: { gradient: 'from-yellow-500 to-amber-500', ring: 'ring-yellow-200' },
  B6: { gradient: 'from-blue-500 to-cyan-500', ring: 'ring-cyan-200' },
  TK: { gradient: 'from-red-500 to-red-700', ring: 'ring-red-200' },
};

function extractIata(input: string): string {
  const m = input.match(/\(([^)]+)\)/);
  return (m?.[1] ?? input).trim().toUpperCase();
}

function looksLikeAirlineCode(s: string): boolean {
  // basic check: typical IATA airline code is 2 alnum chars
  return /^[A-Z0-9]{2}$/.test((s ?? '').trim().toUpperCase());
}

function resolveCarrierName(rawCarrier: string): { code: string | null; name: string } {
  const cleaned = (rawCarrier ?? '').trim();
  const upper = cleaned.toUpperCase();

  if (looksLikeAirlineCode(upper)) {
    return { code: upper, name: AIRLINE_NAME[upper] ?? upper };
  }
  // if backend already sends full name (or something else), keep it
  return { code: null, name: cleaned || 'Airline' };
}

function formatDuration(duration: string): string {
  if (!duration?.startsWith('PT')) return duration;
  const h = duration.match(/(\d+)H/)?.[1];
  const m = duration.match(/(\d+)M/)?.[1];
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.length ? parts.join(' ') : duration;
}

function formatTime(dt: string): string {
  const parsed = new Date(dt.includes(' ') ? dt.replace(' ', 'T') : dt);
  if (Number.isNaN(parsed.getTime())) return dt;
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AirlineLogo({ code, name }: { code: string | null; name: string }) {
  const upper = (code ?? '').toUpperCase();
  const style = AIRLINE_STYLE[upper] ?? { gradient: 'from-slate-600 to-slate-800', ring: 'ring-slate-200' };
  const label = upper || name.charAt(0).toUpperCase();

  return (
    <div
      className={[
        'w-12 h-12 rounded-xl flex items-center justify-center',
        'text-white font-semibold tracking-wide',
        'bg-gradient-to-br',
        style.gradient,
        'ring-1',
        style.ring,
        'shadow-sm',
      ].join(' ')}
      title={name}
      aria-label={`${name} logo`}
    >
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function SearchResults({ searchParams, onSelect, onBack }: SearchResultsProps) {
  const [results, setResults] = React.useState<Offer[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);

      setLoading(true);
      try {
        const origin = extractIata(searchParams.from);
        const destination = extractIata(searchParams.to);

        const res = await fetch('http://localhost:8000/api/flights/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            destination,
            date: searchParams.date,
            passengers: searchParams.passengers,
            currency: 'USD',
            non_stop: false,
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to fetch flights');
        }

        const data: { offers: Offer[] } = await res.json();
        if (!cancelled) setResults(data.offers ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Something went wrong fetching flights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const originCode = extractIata(searchParams.from);
  const destCode = extractIata(searchParams.to);

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8">
      {/* Back Button & Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to search
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {searchParams.from} → {searchParams.to}
        </h2>
        <p className="text-slate-600">
          {searchParams.date} • {searchParams.passengers}{' '}
          {searchParams.passengers === 1 ? 'passenger' : 'passengers'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 flex items-center gap-4 border border-slate-200">
        <button className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium">
          Best Price
        </button>
        <div className="ml-auto text-sm text-slate-600">
          {loading ? 'Searching…' : `${results.length} options found`}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 animate-pulse"
            >
              <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
              <div className="h-8 w-full bg-slate-200 rounded mb-2" />
              <div className="h-8 w-3/4 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Results List */}
      {!loading && (
        <div className="space-y-4">
          {results.map((result, index) => {
            const { code: carrierCode, name: carrierName } = resolveCarrierName(result.carrier);

            return (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {/* Carrier */}
                    <div className="flex items-center gap-3 mb-4">
                      <AirlineLogo code={carrierCode} name={carrierName} />
                      <div>
                        <h3 className="font-semibold text-slate-900">{carrierName}</h3>
                        <p className="text-sm text-slate-500">
                          {carrierCode ? `${carrierCode} • ` : ''}
                          {result.id}
                        </p>
                      </div>

                      {result.direct && (
                        <span className="ml-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          Direct
                        </span>
                      )}
                    </div>

                    {/* Times */}
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{formatTime(result.departure)}</p>
                        <p className="text-sm text-slate-500">{originCode}</p>
                      </div>

                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-200 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white px-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          {formatDuration(result.duration)}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      <div>
                        <p className="text-2xl font-bold text-slate-900">{formatTime(result.arrival)}</p>
                        <p className="text-sm text-slate-500">{destCode}</p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                      <span>
                        {typeof result.seats === 'number' ? `${result.seats} seats available` : 'Limited seats'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-green-500" />
                        Instant confirmation
                      </span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="ml-8 text-right flex flex-col items-end gap-4">
                    <div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-bold text-slate-900">
                          {Number.isFinite(result.price) ? result.price.toFixed(2) : result.price}
                        </span>
                        <span className="text-slate-500">USDC</span>
                      </div>
                      <p className="text-sm text-slate-500">total (for {searchParams.passengers})</p>
                    </div>

                    <button
                      onClick={() =>
                        onSelect({
                          ...result,
                          carrier: carrierName,
                          carrierName,
                          carrierCode,
                          origin: originCode,
                          destination: destCode,
                          date: searchParams.date,
                          passengers: searchParams.passengers,
                        })
                      }
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 group-hover:scale-105"
                    >
                      Select
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {!loading && !error && results.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center text-slate-600">
              No options found for this route/date. Try another date or airport.
            </div>
          )}
        </div>
      )}

      {/* Payment Info Footer */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Pay with Stablecoins</h4>
            <p className="text-sm text-slate-600">
              All prices shown in USDC. You can also pay with USDT or DAI on Plasma.
              Transactions are instant and fully on-chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
