#!/usr/bin/env node

import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readInstallConfig } from "./configure.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const passes = [];
const failures = [];
const check = (condition, label, detail = "") => (condition ? passes : failures).push({ label, detail });

function run(args, cwd = root) {
  return spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
}

async function walk(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "coverage", ".cache"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path, output);
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

async function main() {
  const dashboardValidation = run([".agents/skills/maintain-live-repository-dashboard/scripts/validate-dashboard.mjs"]);
  process.stdout.write(dashboardValidation.stdout || "");
  process.stderr.write(dashboardValidation.stderr || "");
  check(dashboardValidation.status === 0, "dashboard validator passes", `exit ${dashboardValidation.status}`);

  const baseConfig = await readInstallConfig(resolve(root, "dashboard/index.html"));
  check(baseConfig.owner === "" && baseConfig.repo === "" && baseConfig.ref === "main", "distribution template has blank repository defaults", JSON.stringify(baseConfig));

  const required = [
    "AGENTS.md", "README.md", "SECURITY.md", "LICENSE", "package.json",
    "dashboard/index.html", "scripts/configure.mjs", "scripts/install.mjs", "scripts/serve.mjs",
    "docs/INSTALLATION.md", "docs/INSTALLATION.sv.md", "docs/USAGE.md", "docs/ARCHITECTURE.md",
    ".agents/skills/maintain-live-repository-dashboard/SKILL.md",
    ".agents/skills/maintain-live-repository-dashboard/scripts/validate-dashboard.mjs"
  ];
  for (const path of required) {
    try { check((await stat(resolve(root, path))).isFile(), `required package file exists: ${path}`); }
    catch (error) { check(false, `required package file exists: ${path}`, error.message); }
  }

  const license = await readFile(resolve(root, "LICENSE"), "utf8");
  check(/^MIT License\r?\n/.test(license), "package declares the MIT License");
  check(license.includes("Repository Intelligence Dashboard contributors"), "license identifies the project contributors as copyright holders");
  check(license.includes("The above copyright notice and this permission notice shall be included"), "license retains the MIT notice condition");
  check(!await stat(resolve(root, "LICENSE.template")).then(() => true).catch((error) => {
    if (error?.code === "ENOENT") return false;
    throw error;
  }), "obsolete license placeholder is absent");

  const forbiddenIdentities = String(process.env.RID_FORBIDDEN_IDENTITIES || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 4);
  const identityPatterns = forbiddenIdentities.map((value, index) => [
    `caller-supplied identity #${index + 1}`,
    new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
  ]);
  const secretPatterns = [
    ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ["GitHub classic token", /\bghp_[A-Za-z0-9]{30,}\b/],
    ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
    ["OpenAI-style secret", /\bsk-[A-Za-z0-9]{20,}\b/],
    ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
    ["bearer credential", /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/]
  ];
  const leaks = [];
  const secretHits = [];
  for (const file of await walk(root)) {
    const relativePath = relative(root, file);
    const content = await readFile(file, "utf8").catch(() => null);
    if (content === null) continue;
    for (const [label, pattern] of identityPatterns) if (pattern.test(content)) leaks.push(`${relativePath}: ${label}`);
    for (const [label, pattern] of secretPatterns) if (pattern.test(content)) secretHits.push(`${relativePath}: ${label}`);
  }
  check(leaks.length === 0, "package contains no caller-supplied source identifiers", leaks.join(", "));
  check(secretHits.length === 0, "package contains no credential-shaped value", secretHits.join(", "));

  const disposable = await mkdtemp(join(tmpdir(), "rid-package-validation-"));
  const installTarget = resolve(disposable, "installed-dashboard");
  const blankTarget = resolve(disposable, "blank-dashboard");
  try {
    const blankInstall = run(["scripts/install.mjs", "--output", blankTarget]);
    process.stdout.write(blankInstall.stdout || "");
    process.stderr.write(blankInstall.stderr || "");
    check(blankInstall.status === 0, "installer creates a validated blank copy", `exit ${blankInstall.status}`);
    const blankConfig = await readInstallConfig(resolve(blankTarget, "dashboard/index.html"));
    check(blankConfig.owner === "" && blankConfig.repo === "" && blankConfig.ref === "main", "blank installation contains no repository identity", JSON.stringify(blankConfig));
    const overwriteAttempt = run(["scripts/install.mjs", "--output", blankTarget]);
    check(overwriteAttempt.status !== 0, "installer refuses an existing destination");

    const install = run([
      "scripts/install.mjs", "--output", installTarget,
      "--owner", "example-owner", "--repo", "example-repository", "--ref", "main",
      "--name", "Example Repository Dashboard", "--init-git"
    ]);
    process.stdout.write(install.stdout || "");
    process.stderr.write(install.stderr || "");
    check(install.status === 0, "installer creates and validates a configured copy", `exit ${install.status}`);
    const installedConfig = await readInstallConfig(resolve(installTarget, "dashboard/index.html"));
    check(installedConfig.owner === "example-owner" && installedConfig.repo === "example-repository" && installedConfig.appName === "Example Repository Dashboard", "installed configuration matches requested non-secret defaults", JSON.stringify(installedConfig));
    check((await stat(resolve(installTarget, ".git"))).isDirectory(), "optional git initialization creates a fresh repository");

    const installedValidation = run([".agents/skills/maintain-live-repository-dashboard/scripts/validate-dashboard.mjs"], installTarget);
    process.stdout.write(installedValidation.stdout || "");
    process.stderr.write(installedValidation.stderr || "");
    check(installedValidation.status === 0, "installed copy passes dashboard validator", `exit ${installedValidation.status}`);

    const configure = run([
      "scripts/configure.mjs", "--owner", "second-owner", "--repo", "second-repository",
      "--ref", "release/v1", "--name", "Second Repository Dashboard"
    ], installTarget);
    process.stdout.write(configure.stdout || "");
    process.stderr.write(configure.stderr || "");
    check(configure.status === 0, "installed copy can be safely reconfigured", `exit ${configure.status}`);
    const reconfigured = await readInstallConfig(resolve(installTarget, "dashboard/index.html"));
    check(reconfigured.owner === "second-owner" && reconfigured.repo === "second-repository" && reconfigured.ref === "release/v1", "reconfiguration updates only declared connection defaults", JSON.stringify(reconfigured));

    const rejected = run(["scripts/configure.mjs", "--token", "not-a-real-token"], installTarget);
    check(rejected.status !== 0, "configuration CLI rejects credential-bearing options");
  } finally {
    await rm(disposable, { recursive: true, force: true });
  }

  for (const item of passes) process.stdout.write(`[PASS] ${item.label}\n`);
  for (const item of failures) process.stderr.write(`[FAIL] ${item.label}${item.detail ? ` — ${item.detail}` : ""}\n`);
  process.stdout.write(`\n${passes.length} package checks passed · ${failures.length} failed\n`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`[ERROR] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
