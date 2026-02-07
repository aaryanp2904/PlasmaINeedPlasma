import "dotenv/config";

const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID ?? "";
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET ?? "";
const AMADEUS_ENV = (process.env.AMADEUS_ENV ?? "test").toLowerCase().trim();

const AMADEUS_BASE =
  AMADEUS_ENV === "prod" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

// ---- simple in-memory token cache ----
let token: string | null = null;
let tokenExpiry = 0; // epoch seconds
let inFlightTokenPromise: Promise<string> | null = null;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 20000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getAmadeusToken(): Promise<string> {
  if (token && nowSec() < tokenExpiry - 30) return token;

  if (!AMADEUS_CLIENT_ID || !AMADEUS_CLIENT_SECRET) {
    const err = new Error("Missing AMADEUS_CLIENT_ID/AMADEUS_CLIENT_SECRET");
    (err as any).statusCode = 500;
    throw err;
  }

  if (inFlightTokenPromise) return inFlightTokenPromise;

  inFlightTokenPromise = (async () => {
    const url = `${AMADEUS_BASE}/v1/security/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AMADEUS_CLIENT_ID,
      client_secret: AMADEUS_CLIENT_SECRET,
    });

    const r = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      timeoutMs: 20000,
    });

    if (!r.ok) {
      const text = await r.text();
      const err = new Error(`Amadeus auth failed: ${text}`);
      (err as any).statusCode = 502;
      throw err;
    }

    const payload: any = await r.json();
    token = payload.access_token;
    tokenExpiry = nowSec() + Number(payload.expires_in ?? 900);
    return token!;
  })();

  try {
    return await inFlightTokenPromise;
  } finally {
    inFlightTokenPromise = null;
  }
}

type FlightSearchRequest = {
  origin: string;
  destination: string;
  date: string;
  passengers?: number;
  currency?: string;
  non_stop?: boolean;
};

type FlightOffer = {
  id: string;
  carrier: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  direct: boolean;
  seats?: number | null;
};

type FlightSearchResponse = { offers: FlightOffer[] };

function pickCarrier(offer: any): string {
  const codes: string[] = offer?.validatingAirlineCodes ?? [];
  return codes.length ? codes[0] : "AIRLINE";
}

function isoToPretty(isoDt: string): string {
  return String(isoDt).replace("T", " ");
}

export async function searchFlights(req: FlightSearchRequest): Promise<FlightSearchResponse> {
  const t = await getAmadeusToken();

  const params = new URLSearchParams({
    originLocationCode: req.origin.toUpperCase(),
    destinationLocationCode: req.destination.toUpperCase(),
    departureDate: req.date,
    adults: String(req.passengers ?? 1),
    currencyCode: (req.currency ?? "USD").toUpperCase(),
    nonStop: req.non_stop ? "true" : "false",
    max: "25",
  });

  const url = `${AMADEUS_BASE}/v2/shopping/flight-offers?${params.toString()}`;
  const r = await fetchWithTimeout(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${t}` },
    timeoutMs: 25000,
  });

  if (!r.ok) {
    const text = await r.text();
    const err = new Error(`Amadeus flight search failed: ${text}`);
    (err as any).statusCode = 502;
    throw err;
  }

  const raw: any = await r.json();
  const data: any[] = raw?.data ?? [];

  const offers: FlightOffer[] = [];

  for (const offer of data) {
    try {
      const itineraries = offer?.itineraries ?? [];
      if (!itineraries.length) continue;

      const segs = itineraries[0]?.segments ?? [];
      if (!segs.length) continue;

      const dep = segs[0]?.departure?.at;
      const arr = segs[segs.length - 1]?.arrival?.at;
      if (!dep || !arr) continue;

      const direct = segs.length === 1;
      const duration = itineraries[0]?.duration ?? "PT0M";

      const priceTotal = Number(offer?.price?.grandTotal);
      if (!Number.isFinite(priceTotal)) continue;

      offers.push({
        id: String(offer?.id ?? ""),
        carrier: pickCarrier(offer),
        departure: isoToPretty(dep),
        arrival: isoToPretty(arr),
        duration,
        price: priceTotal,
        direct,
        seats: null,
      });
    } catch {
      continue;
    }
  }

  offers.sort((a, b) => a.price - b.price);
  return { offers };
}
