// SENTINEL Live Lab API — public dashboard + authenticated event ingestion.
// The honeypot itself should remain private and run only in an isolated lab.
"use strict";

const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;
const INGEST_TOKEN = process.env.INGEST_TOKEN;
const MAX_EVENTS = 500;
const events = [];

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function maskIp(value) {
  if (typeof value !== "string") return "unknown";
  // Public dashboard masks the source IP. Never publish raw IP addresses.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    const parts = value.split(".");
    return parts.slice(0, 3).join(".") + ".x";
  }
  if (value.includes(":")) return "IPv6 source (masked)";
  return "unknown";
}

function classify(eventId, message) {
  const text = (String(eventId || "") + " " + String(message || "")).toLowerCase();
  if (/login.failed|auth.failed|failed login|password attempt|login attempt/.test(text)) return "High";
  if (/session.connect|connection|login.success|command|client.version/.test(text)) return "Medium";
  return "Info";
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "sentinel-live-lab" }));

app.get("/api/events", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ events: events.slice(0, 100), count: events.length });
});

app.post("/api/ingest", (req, res) => {
  if (!INGEST_TOKEN) return res.status(503).json({ error: "Ingest is not configured." });
  const auth = req.get("authorization") || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!safeEqual(supplied, INGEST_TOKEN)) return res.status(401).json({ error: "Unauthorized" });

  const input = req.body || {};
  const eventId = typeof input.eventid === "string" ? input.eventid.slice(0, 100) : "cowrie.event";
  const message = typeof input.message === "string" ? input.message.slice(0, 220) : "Recorded honeypot event";
  const timestamp = typeof input.timestamp === "string" && !Number.isNaN(Date.parse(input.timestamp))
    ? new Date(input.timestamp).toISOString() : new Date().toISOString();

  const record = {
    id: crypto.randomUUID(),
    timestamp,
    source: maskIp(input.src_ip),
    protocol: ["ssh", "telnet"].includes(input.protocol) ? input.protocol : "unknown",
    eventType: eventId,
    message,
    risk: classify(eventId, message)
  };
  events.unshift(record);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  res.status(201).json({ ok: true });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SENTINEL dashboard listening on port ${PORT}`);
});
