"use strict";
const jwt = require("jsonwebtoken");

module.exports = function authGuard(opts = {}) {
  const { required = true } = opts;
  return (req, res, next) => {
    const hdr = req.headers["authorization"] || "";
    const token =
      (hdr.startsWith("Bearer ") ? hdr.slice(7) : null) ||
      (req.cookies ? req.cookies.token : null);

    if (!token) return required ? res.status(401).json({ error: "Unauthorized" }) : next();
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "change_me_ultra_secret");
      req.user = payload;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
};
