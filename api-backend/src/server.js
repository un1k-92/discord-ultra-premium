"use strict";
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");

const applySecurity = require("./middlewares/security");
const apiLimiter   = require("./middlewares/rateLimit");

// DB optionnelle (ne casse pas si absente)
try {
  require("./utils/db");
} catch (e) {
  console.warn("[DB] utils/db.js non chargé:", e.message);
}

const app = express();

// Confiance reverse proxy (si derrière IIS/Nginx)
const TRUST_PROXY = parseInt(process.env.TRUST_PROXY || "1", 10);
app.set("trust proxy", TRUST_PROXY);

// Parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// Sécurité (helmet/cors, etc.)
applySecurity(app);

/* ---------------- Health / Root (hors rate limit) ---------------- */
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    env: process.env.NODE_ENV || "development",
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    ts: Date.now()
  });
});

app.get("/", (_req, res) => {
  res.type("text").send("API online. Try /health");
});
/* ----------------------------------------------------------------- */

// Rate limit uniquement sur /api
app.use("/api", apiLimiter);

// Routes API (tolérantes si absentes)
try { app.use("/api/auth",  require("./routes/auth")); }  catch (e) { console.warn("[Route] /api/auth indisponible:", e.message); }
try { app.use("/api/cache", require("./routes/cacheDemo")); } catch { /* noop */ }

// 404 API
app.use("/api", (_req, res) => res.status(404).json({ error: "Not Found" }));

// Handler d'erreurs
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[Error]", err);
  const s = err.status || 500;
  res.status(s).json({ error: err.message || "Internal Server Error", status: s, ts: Date.now() });
});

// Lancement serveur
// - Par défaut écoute en IPv6 ('::') → couvre aussi IPv4 sur Windows.
// - Forcer IPv4 en mettant FORCE_IPV4=1
const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = (process.env.FORCE_IPV4 === "1") ? "0.0.0.0" : (process.env.HOST || "::");

app.listen(PORT, HOST, () => {
  const shown = HOST === "::" ? "[::]" : HOST;
  console.log(`[API] http://${shown}:${PORT} • env=${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
