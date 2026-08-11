#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const defaultDashboard = resolve(root, "dashboard/index.html");
const markerPattern = /\/\*__RID_INSTALL_CONFIG__\*\/\{[^\r\n;]*\}/;
const forbiddenOption = /(?:token|secret|password|credential|authorization|auth|api[-_]?key)/i;

function assertText(value, label, maximum) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  if (value.length > maximum) throw new Error(`${label} must be ${maximum} characters or fewer.`);
  if (/\p{Cc}/u.test(value) || /[<>\u2028\u2029]/.test(value)) throw new Error(`${label} contains an unsafe control, markup, or line-separator character.`);
}

function validOwner(owner) {
  return !owner || /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner) && !owner.includes("--");
}

function validRepository(repository) {
  return !repository || /^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/.test(repository);
}

function validRef(ref) {
  return Boolean(ref) && ref.length <= 200 && !/[\s~^:?*[\\\x00-\x1f\x7f]/.test(ref)
    && !ref.includes("..") && !ref.includes("//") && !ref.includes("@{")
    && !ref.startsWith("/") && !ref.endsWith("/") && !ref.endsWith(".") && !ref.endsWith(".lock");
}

export function normalizeInstallConfig(input = {}) {
  const config = {
    appName: String(input.appName ?? "Repository Intelligence Dashboard").trim(),
    owner: String(input.owner ?? "").trim(),
    repo: String(input.repo ?? "").trim(),
    ref: String(input.ref ?? "main").trim()
  };
  assertText(config.appName, "Application name", 80);
  assertText(config.owner, "GitHub owner", 39);
  assertText(config.repo, "GitHub repository", 100);
  assertText(config.ref, "GitHub ref", 200);
  if (!config.appName) throw new Error("Application name cannot be empty.");
  if (!validOwner(config.owner)) throw new Error("GitHub owner has an invalid format.");
  if (!validRepository(config.repo)) throw new Error("GitHub repository has an invalid format.");
  if (Boolean(config.owner) !== Boolean(config.repo)) throw new Error("GitHub owner and repository must either both be set or both be empty.");
  if (!validRef(config.ref)) throw new Error("GitHub ref has an invalid or unsafe format.");
  return Object.freeze(config);
}

export async function readInstallConfig(dashboardPath = defaultDashboard) {
  const html = await readFile(resolve(dashboardPath), "utf8");
  const match = html.match(markerPattern);
  if (!match) throw new Error(`Installation config marker is missing from ${dashboardPath}.`);
  const raw = match[0].replace("/*__RID_INSTALL_CONFIG__*/", "");
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (error) { throw new Error(`Installation config is not valid JSON: ${error.message}`); }
  return normalizeInstallConfig(parsed);
}

export async function configureDashboard(config, dashboardPath = defaultDashboard) {
  const target = resolve(dashboardPath);
  const normalized = normalizeInstallConfig(config);
  const html = await readFile(target, "utf8");
  const matches = html.match(new RegExp(markerPattern.source, "g")) || [];
  if (matches.length !== 1) throw new Error(`Expected exactly one installation config marker in ${target}; found ${matches.length}.`);
  const replacement = `/*__RID_INSTALL_CONFIG__*/${JSON.stringify(normalized)}`;
  const next = html.replace(markerPattern, replacement);
  await writeFile(target, next, "utf8");
  return normalized;
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (forbiddenOption.test(option)) throw new Error(`Secret-bearing option is not supported: ${option}`);
    if (option === "--help" || option === "-h") { values.help = true; continue; }
    const key = ({ "--file": "file", "--owner": "owner", "--repo": "repo", "--ref": "ref", "--name": "appName" })[option];
    if (!key) throw new Error(`Unknown option: ${option}`);
    if (index + 1 >= argv.length) throw new Error(`Missing value for ${option}.`);
    values[key] = argv[++index];
  }
  return values;
}

function usage() {
  return `Configure non-secret dashboard defaults.

Usage:
  node scripts/configure.mjs [options]

Options:
  --file <path>    Dashboard HTML to configure (default: dashboard/index.html)
  --owner <name>   Default GitHub owner; use "" together with --repo "" for blank
  --repo <name>    Default GitHub repository
  --ref <ref>      Default branch, tag, or SHA
  --name <text>    Application display name
  --help           Show this help

Tokens, passwords, credentials, and API keys are intentionally unsupported.`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(`${usage()}\n`); return; }
  const dashboardPath = resolve(args.file || defaultDashboard);
  const current = await readInstallConfig(dashboardPath);
  const next = await configureDashboard({
    appName: args.appName ?? current.appName,
    owner: args.owner ?? current.owner,
    repo: args.repo ?? current.repo,
    ref: args.ref ?? current.ref
  }, dashboardPath);
  process.stdout.write(`Configured ${dashboardPath}\n`);
  process.stdout.write(`Application: ${next.appName}\n`);
  process.stdout.write(`Default source: ${next.owner && next.repo ? `${next.owner}/${next.repo}@${next.ref}` : `blank@${next.ref}`}\n`);
}

const isDirect = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirect) main().catch((error) => {
  process.stderr.write(`[ERROR] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
