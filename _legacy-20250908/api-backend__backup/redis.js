@'
"use strict";
const Redis = require("ioredis");

const url   = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isTLS = url.startsWith("rediss://");

const redis = new Redis(url, {
  lazyConnect: false,
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
});

redis.on("connect", ()=> console.log("[Redis] connecting..."));
redis.on("ready",   ()=> console.log("[Redis] ready"));
redis.on("error",   e  => console.error("[Redis] error:", e.message));
redis.on("close",   ()=> console.warn("[Redis] connection closed"));

module.exports = redis;
'@ | Set-Content -Encoding UTF8 C:\discord-ultra-PSAAS\api-backend\src\utils\redis.js
