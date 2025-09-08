"use strict";
const router = require("express").Router();
const redis = require("../utils/redis");

router.get("/health", async (_req, res) => {
  try {
    const pong = await redis.ping();
    res.json({
      ok: true,
      redis: pong === "PONG",
      uptime: process.uptime(),
      ts: Date.now(),
      env: process.env.NODE_ENV || "development",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, ts: Date.now() });
  }
});

module.exports = router;
