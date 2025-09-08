"use strict";
const redis = require("../utils/redis");

module.exports = function cache(ttlSeconds) {
  const ttl = parseInt(process.env.CACHE_TTL_SECONDS || ttlSeconds || "60", 10);
  return async (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = `cache:${req.originalUrl}`;
    try {
      const hit = await redis.get(key);
      if (hit) {
        res.set("X-Cache", "HIT");
        return res.status(200).type("application/json").send(hit);
      }
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        try {
          redis.set(key, JSON.stringify(body), "EX", ttl).catch(() => {});
          res.set("X-Cache", "MISS");
        } catch {}
        return originalJson(body);
      };
      return next();
    } catch {
      return next();
    }
  };
};
