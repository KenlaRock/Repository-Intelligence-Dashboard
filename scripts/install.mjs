#!/usr/bin/env node

import { cp, mkdir, mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, basename, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { configureDashboard, normalizeInstallConfig } from "./configure.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const sourceRoot = resolve(dirname(scriptPath), "..");
const copyEntries = [
  ".agents",
  ".gitignore",
  "AGENTS.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "dashboard",
  "docs",
  "package.json",
  "scripts"
];
const forbiddenOption = /(?:token|secret|password|credential|authorization|auth|api[-_]?key)/i;

function parseArgs(argv) {
  const values = { appName: "Repository Intelligence Dashboard", owner: "", repo: "", ref: "main", initGit: false };
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (forbiddenOption.test(option)) throw new Error(`Secret-bearing option is not supported: ${option}`);
    if (option === "--help" || option === "-h") { values.help = true; continue; }
    if (option === "--init-git") { values.initGit = true; continue; }
    const key = ({ "--output": "output", "--owner": "owner", "--repo": "repo", "--ref": "ref", "--name": "appName" })[option];
    if (!key) throw new Error(`Unknown option: ${option}`);
    if (index + 1 >= argv.length) throw new Error(`Missing value for ${option}.`);
    values[key] = argv[++index];
  }
  return values;
}

function usage() {
  return `Create a clean Repository Intelligence Dashboard installation.

Usage:
  node scripts/install.mjs --output <new-directory> [options]

Options:
  --owner <name>   Optional default GitHub owner
  --repo <name>    Optional default GitHub repository
  --ref <ref>      Default branch, tag, or SHA (default: main)
  --name <text>    Application display name
  --init-git       Run git init -b main in the installed copy
  --help           Show this help

The destination must not exist. Tokens and other secrets are unsupported.`;
}

async function exists(path) {
  try { await stat(path); return true; }
  catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

function isInside(parent, child) {
  const relation = relative(parent, child);
  return relation === "" || !relation.startsWith(`..${sep}`) && relation !== ".." && !relation.includes(":");
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(`${usage()}\n`); return; }
  if (!args.output) throw new Error("--output is required.");
  const config = normalizeInstallConfig(args);
  const output = resolve(process.cwd(), args.output);
  if (isInside(sourceRoot, output)) throw new Error("Destination must be outside the template source directory.");
  if (await exists(output)) throw new Error(`Destination already exists: ${output}`);

  const parent = dirname(output);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(join(parent, `.${basename(output)}-install-`));
  try {
    for (const entry of copyEntries) {
      const source = resolve(sourceRoot, entry);
      if (!await exists(source)) throw new Error(`Required template entry is missing: ${entry}`);
      await cp(source, resolve(staging, entry), { recursive: true, errorOnExist: true });
    }
    await configureDashboard(config, resolve(staging, "dashboard/index.html"));
    run(process.execPath, [".agents/skills/maintain-live-repository-dashboard/scripts/validate-dashboard.mjs"], staging);
    if (args.initGit) {
      run("git", ["init", "-b", "main"], staging);
      const gitEntries = await readdir(resolve(staging, ".git"));
      if (!gitEntries.length) throw new Error("git init did not create repository metadata.");
    }
    await rename(staging, output);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }

  process.stdout.write(`Installed Repository Intelligence Dashboard at ${output}\n`);
  process.stdout.write(`Default source: ${config.owner && config.repo ? `${config.owner}/${config.repo}@${config.ref}` : `blank@${config.ref}`}\n`);
  process.stdout.write("No credential was accepted, stored, or written.\n");
}

main().catch((error) => {
  process.stderr.write(`[ERROR] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
