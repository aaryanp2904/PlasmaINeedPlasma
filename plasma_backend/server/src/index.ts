import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import { txRouter } from "./routes/tx";
import { readRouter } from "./routes/read";
import { oracleRouter } from "./routes/oracle";
import { flightsRouter } from "./routes/flights";

const app = express();

// CORS (like your Python version: ALLOWED_ORIGINS env var)
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// If you want "open CORS" during hackathon, you can keep app.use(cors()).
// This version restricts to allowedOrigins but still allows curl/postman (no Origin header).
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow non-browser clients
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    env: (process.env.AMADEUS_ENV ?? "test").toLowerCase().trim(),
  })
);

app.use("/api/tx", txRouter);
app.use("/api/read", readRouter);
app.use("/api/oracle", oracleRouter);

// ✅ NEW: serves POST /api/flights/search
app.use("/api/flights", flightsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 8000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
