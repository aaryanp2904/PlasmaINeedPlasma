import { Router } from "express";
import { z } from "zod";
import { searchFlights } from "../services/amadeus";

export const flightsRouter = Router();

const FlightSearchSchema = z.object({
  origin: z.string().min(3),
  destination: z.string().min(3),
  date: z.string().min(8), // keep simple like Python (YYYY-MM-DD expected)
  passengers: z.number().int().min(1).max(9).optional().default(1),
  currency: z.string().optional().default("USD"),
  non_stop: z.boolean().optional().default(false),
});

flightsRouter.post("/search", async (req, res) => {
  const parsed = FlightSearchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ detail: parsed.error.flatten() });
  }

  try {
    const out = await searchFlights(parsed.data);
    return res.json(out);
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    return res.status(status).json({ detail: e?.message ?? "Unknown error" });
  }
});
