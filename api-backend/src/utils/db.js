"use strict";
const mongoose = require("mongoose");

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ultra-psaas";
mongoose.set("strictQuery", true);

async function connect() {
  try {
    await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5000, maxPoolSize: 10 });
    console.log("[Mongo] connected");
  } catch (e) { console.error("[Mongo] connection error:", e.message); }
}
mongoose.connection.on("disconnected", () => console.warn("[Mongo] disconnected"));
mongoose.connection.on("error", (e) => console.error("[Mongo] error:", e.message));
connect();

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("[Mongo] connection closed on SIGINT");
  process.exit(0);
});

module.exports = mongoose;
