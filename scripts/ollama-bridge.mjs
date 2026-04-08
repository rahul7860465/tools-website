import http from "node:http";
import { URL } from "node:url";

const BRIDGE_PORT = Number(process.env.OLLAMA_BRIDGE_PORT || 11435);
const TARGET_BASE = String(process.env.OLLAMA_ENDPOINT || "http://127.0.0.1:11434").replace(/\/+$/, "");

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  });
  res.end(text);
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function proxyJson(req, res, targetPath) {
  try {
    const url = new URL(`${TARGET_BASE}${targetPath}`);
    const body = req.method === "POST" ? await readBody(req) : undefined;
    const upstream = await fetch(url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body,
    });
    const txt = await upstream.text();
    setCors(res);
    res.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") || "application/json" });
    res.end(txt);
  } catch (e) {
    sendJson(res, 502, { error: "bridge_upstream_failed", message: e instanceof Error ? e.message : "Unknown error" });
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "OPTIONS") {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }
  if (u.pathname === "/health") {
    sendJson(res, 200, { ok: true, target: TARGET_BASE });
    return;
  }
  if (u.pathname === "/api/tags" && req.method === "GET") {
    await proxyJson(req, res, "/api/tags");
    return;
  }
  if (u.pathname === "/api/generate" && req.method === "POST") {
    await proxyJson(req, res, "/api/generate");
    return;
  }
  sendJson(res, 404, { error: "not_found" });
});

server.listen(BRIDGE_PORT, "127.0.0.1", () => {
  console.log(`Ollama bridge running at http://127.0.0.1:${BRIDGE_PORT}`);
  console.log(`Forwarding to ${TARGET_BASE}`);
});
