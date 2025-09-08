"use strict";
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const xssClean = require("xss-clean");

function parseOrigins(str) { return (str || "").split(/[,\s]+/).filter(Boolean); }

module.exports = function applySecurity(app) {
  const origins = parseOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN);
  const allowAll = origins.length === 0;

  const corsOptions = {
    origin(origin, cb) {
      if (allowAll || !origin || origins.includes(origin)) return cb(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
      return cb(new Error("CORS blocked"));
    },
    credentials: process.env.CORS_CREDENTIALS !== "false",
    optionsSuccessStatus: 204,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Authorization,Content-Type",
    maxAge: 86400,
  };
  app.use(cors(corsOptions));

  app.use(helmet({
    contentSecurityPolicy: process.env.HELMET_CSP === "true" ? undefined : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: process.env.HSTS_ENABLED === "false" ? false : { maxAge: 15552000, includeSubDomains: true, preload: false },
  }));

  app.use(compression({
    level: 6,
    threshold: parseInt(process.env.COMPRESSION_THRESHOLD || "1024", 10),
    filter: (req, res) => req.headers["x-no-compress"] ? false : compression.filter(req, res),
  }));

  app.use(mongoSanitize());
  if (typeof xssClean === "function") app.use(xssClean());
  app.use(hpp());
};
