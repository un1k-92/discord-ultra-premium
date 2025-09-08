"use strict";
const rateLimit = require("express-rate-limit");

const windowMs  = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const max       = parseInt(process.env.RATE_LIMIT_MAX || "120", 10);
const stdHdrs   = (process.env.RATE_LIMIT_STD_HEADERS || "true") !== "false";
const legacyHdr = process.env.RATE_LIMIT_LEGACY_HEADERS === "true";
const skipOK    = process.env.RATE_LIMIT_SKIP_SUCCESS === "true";

module.exports = rateLimit({
  windowMs,
  max,
  standardHeaders: stdHdrs,
  legacyHeaders: legacyHdr,
  skipSuccessfulRequests: skipOK,
  handler: (_req, res) => res.status(429).json({ error: "Too many requests, slow down." }),
});
