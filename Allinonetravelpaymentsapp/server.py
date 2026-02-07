import os
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID", "")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET", "")
AMADEUS_ENV = os.getenv("AMADEUS_ENV", "test").lower().strip()

if AMADEUS_ENV == "prod":
    AMADEUS_BASE = "https://api.amadeus.com"
else:
    AMADEUS_BASE = "https://test.api.amadeus.com"

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]

app = FastAPI(title="Plasma Travel Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- simple in-memory token cache ----
_token: Optional[str] = None
_token_expiry: float = 0.0  # epoch seconds

async def get_amadeus_token() -> str:
    global _token, _token_expiry

    if _token and time.time() < (_token_expiry - 30):
        return _token

    if not AMADEUS_CLIENT_ID or not AMADEUS_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Missing AMADEUS_CLIENT_ID/AMADEUS_CLIENT_SECRET")

    url = f"{AMADEUS_BASE}/v1/security/oauth2/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": AMADEUS_CLIENT_ID,
        "client_secret": AMADEUS_CLIENT_SECRET,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Amadeus auth failed: {r.text}")

        payload = r.json()
        _token = payload["access_token"]
        _token_expiry = time.time() + int(payload.get("expires_in", 900))
        return _token

# ---- API schemas ----
class FlightSearchRequest(BaseModel):
    origin: str = Field(..., description="IATA code, e.g. LHR")
    destination: str = Field(..., description="IATA code, e.g. JFK")
    date: str = Field(..., description="YYYY-MM-DD")
    passengers: int = Field(1, ge=1, le=9)
    currency: str = Field("USD")
    non_stop: bool = Field(False)

class FlightOffer(BaseModel):
    id: str
    carrier: str
    departure: str
    arrival: str
    duration: str
    price: float
    direct: bool
    seats: Optional[int] = None  # not always returned consistently

class FlightSearchResponse(BaseModel):
    offers: List[FlightOffer]

def _pick_carrier(data: Dict[str, Any]) -> str:
    # Uses validatingAirlineCodes where possible.
    codes = data.get("validatingAirlineCodes") or []
    return codes[0] if codes else "AIRLINE"

def _iso_to_pretty(iso_dt: str) -> str:
    # Keep it simple for now; frontend can format nicely if you prefer
    return iso_dt.replace("T", " ")

@app.post("/api/flights/search", response_model=FlightSearchResponse)
async def search_flights(req: FlightSearchRequest):
    token = await get_amadeus_token()

    params = {
        "originLocationCode": req.origin.upper(),
        "destinationLocationCode": req.destination.upper(),
        "departureDate": req.date,
        "adults": req.passengers,
        "currencyCode": req.currency.upper(),
        "nonStop": "true" if req.non_stop else "false",
        "max": 25,
    }

    url = f"{AMADEUS_BASE}/v2/shopping/flight-offers"
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=25) as client:
        r = await client.get(url, params=params, headers=headers)

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Amadeus flight search failed: {r.text}")

    raw = r.json()
    data = raw.get("data", [])

    offers: List[FlightOffer] = []
    for offer in data:
        try:
            itineraries = offer.get("itineraries", [])
            if not itineraries:
                continue

            # One-way: first itinerary, first segment is departure; last segment is arrival
            segs = itineraries[0].get("segments", [])
            if not segs:
                continue

            dep = segs[0]["departure"]["at"]
            arr = segs[-1]["arrival"]["at"]

            direct = len(segs) == 1
            duration = itineraries[0].get("duration", "PT0M")

            price_total = float(offer["price"]["grandTotal"])

            offers.append(
                FlightOffer(
                    id=offer.get("id", ""),
                    carrier=_pick_carrier(offer),
                    departure=_iso_to_pretty(dep),
                    arrival=_iso_to_pretty(arr),
                    duration=duration,
                    price=price_total,
                    direct=direct,
                    seats=None,
                )
            )
        except Exception:
            # Skip malformed items instead of failing whole request
            continue

    # Sort by cheapest
    offers.sort(key=lambda o: o.price)

    return FlightSearchResponse(offers=offers)

@app.get("/health")
async def health():
    return {"ok": True, "env": AMADEUS_ENV}
