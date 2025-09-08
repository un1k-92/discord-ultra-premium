@'
"use strict";
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const authGuard = require("../middlewares/authGuard");

router.get("/ping", (_req,res)=>res.json({ ok:true }));

router.post("/token", (req,res)=>{
  const { userId = "demo", role = "user" } = req.body || {};
  const token = jwt.sign({ sub:userId, role }, process.env.JWT_SECRET || "change_me_ultra_secret", { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
  res.json({ token });
});

router.get("/me", authGuard(), (req,res)=> res.json({ user: req.user }));

module.exports = router;
'@ | Set-Content -Encoding UTF8 C:\discord-ultra-PSAAS\api-backend\src\routes\auth.js
