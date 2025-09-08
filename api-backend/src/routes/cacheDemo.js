"use strict";
const router = require("express").Router();
const cache = require("../middlewares/cache");

router.get("/now", cache(10), async (_req, res) => {
  // Simule un traitement pour voir l'effet du cache
  await new Promise(r => setTimeout(r, 400));
  res.json({ now: new Date().toISOString(), note: "cached 10s" });
});

module.exports = router;
