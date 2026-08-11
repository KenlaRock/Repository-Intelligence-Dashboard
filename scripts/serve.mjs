#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"]
]);

function parseArgs(argv) {
  const values = { host: "127.0.0.1", port: 4173 };
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--help" || option === "-h") { values.help = true; continue; }
    if (!["--host", "--port"].includes(option)) throw new Error(`Unknown option: ${option}`);
    if (index + 1 >= argv.length) throw new Error(`Missing value for ${option}.`);
    values[option.slice(2)] = argv[++index];
  }
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port must be an integer from 1 to 65535.");
  values.port = port;
  return values;
}

function headers(type) {
  return {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; connect-src https://api.github.com; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
}

function safePath(requestUrl) {
  const url = new URL(requestUrl || "/", "http://localhost");
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return null; }
  if (pathname.includes("\0")) return null;
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard/") pathname = "/dashboard/index.html";
  const target = resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null;
  return target;
}

async function handle(request, response) {
  if (!["GET", "HEAD"].includes(request.method || "GET")) {
    response.writeHead(405, { ...headers("text/plain; charset=utf-8"), Allow: "GET, HEAD" });
    response.end("Method not allowed\n");
    return;
  }
  const target = safePath(request.url);
  if (!target) {
    response.writeHead(400, headers("text/plain; charset=utf-8"));
    response.end("Bad request\n");
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw Object.assign(new Error("Not a file"), { code: "ENOENT" });
    response.writeHead(200, { ...headers(mime.get(extname(target).toLowerCase()) || "application/octet-stream"), "Content-Length": info.size });
    if (request.method === "HEAD") { response.end(); return; }
    createReadStream(target).on("error", () => response.destroy()).pipe(response);
  } catch (error) {
    response.writeHead(error?.code === "ENOENT" ? 404 : 500, headers("text/plain; charset=utf-8"));
    response.end(error?.code === "ENOENT" ? "Not found\n" : "Server error\n");
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write("Usage: node scripts/serve.mjs [--host 127.0.0.1] [--port 4173]\n");
    return;
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(args.host)) {
    process.stderr.write(`[WARNING] Binding to ${args.host} can expose the dashboard on your network.\n`);
  }
  const server = createServer((request, response) => { handle(request, response); });
  server.listen(args.port, args.host, () => {
    process.stdout.write(`Repository Intelligence Dashboard: http://${args.host}:${args.port}/\n`);
    process.stdout.write("Press Ctrl+C to stop.\n");
  });
  const close = () => server.close(() => process.exit(0));
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

main().catch((error) => {
  process.stderr.write(`[ERROR] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
