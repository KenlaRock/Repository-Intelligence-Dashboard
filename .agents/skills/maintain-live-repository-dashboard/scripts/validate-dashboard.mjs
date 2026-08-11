#!/usr/bin/env node

async function main() {
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const { spawnSync } = await import("node:child_process");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath, pathToFileURL } = await import("node:url");
  const { runInNewContext } = await import("node:vm");

  const scriptPath = fileURLToPath(import.meta.url);
  const root = resolve(dirname(scriptPath), "../../../..");
  const paths = {
    dashboard: resolve(root, "dashboard/index.html"),
    agents: resolve(root, "AGENTS.md"),
    readme: resolve(root, "README.md"),
    security: resolve(root, "SECURITY.md"),
    skill: resolve(root, ".agents/skills/maintain-live-repository-dashboard/SKILL.md"),
    configure: resolve(root, "scripts/configure.mjs"),
    installer: resolve(root, "scripts/install.mjs"),
    server: resolve(root, "scripts/serve.mjs"),
    package: resolve(root, "package.json")
  };
  const loaded = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, "utf8")])));
  const passes = [];
  const failures = [];
  const check = (condition, label, detail = "") => (condition ? passes : failures).push({ label, detail });

  const scripts = [...loaded.dashboard.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const styles = [...loaded.dashboard.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  check(scripts.length === 1, "exactly one inline runtime script", `found ${scripts.length}`);
  check(styles.length === 1, "exactly one inline stylesheet", `found ${styles.length}`);
  const runtime = scripts[0]?.[2] || "";

  for (const [label, path, code] of [
    ["inline JavaScript", null, runtime],
    ["configure script", paths.configure, null],
    ["installer script", paths.installer, null],
    ["local server script", paths.server, null]
  ]) {
    const syntax = path
      ? spawnSync(process.execPath, ["--check", path], { encoding: "utf8" })
      : spawnSync(process.execPath, ["--check", "-"], { input: code, encoding: "utf8" });
    check(syntax.status === 0, `${label} parses`, (syntax.stderr || syntax.stdout || "").trim());
  }

  const configMatches = [...loaded.dashboard.matchAll(/\/\*__RID_INSTALL_CONFIG__\*\/(\{[^\r\n;]*\})/g)];
  check(configMatches.length === 1, "exactly one marked installation config", `found ${configMatches.length}`);
  let installConfig = null;
  try { installConfig = JSON.parse(configMatches[0]?.[1] || "null"); }
  catch (error) { check(false, "installation config parses as JSON", error.message); }
  if (installConfig) {
    const keys = Object.keys(installConfig).sort();
    check(JSON.stringify(keys) === JSON.stringify(["appName", "owner", "ref", "repo"]), "installation config exposes only non-secret fields", keys.join(", "));
    try {
      const { normalizeInstallConfig } = await import(pathToFileURL(paths.configure).href);
      normalizeInstallConfig(installConfig);
      check(true, "installation config passes shared validation");
    } catch (error) { check(false, "installation config passes shared validation", error.message); }
  }

  const elements = new Map();
  const stubElement = () => ({
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}, dataset: {}, value: "", textContent: "", innerHTML: "", title: "",
    disabled: false, open: false,
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {}, remove() {}, append() {}, scrollIntoView() {},
    showModal() { this.open = true; }, close() { this.open = false; },
    querySelector: () => stubElement(), querySelectorAll: () => []
  });
  const fixtureDocument = {
    title: "", visibilityState: "visible", body: { append() {} },
    querySelector(selector) { if (!elements.has(selector)) elements.set(selector, stubElement()); return elements.get(selector); },
    querySelectorAll: () => [], addEventListener() {}, createElement: () => stubElement()
  };
  const fixtureWindow = {
    document: fixtureDocument,
    location: { href: "https://dashboard.invalid/" },
    CSS: { escape: (value) => String(value) },
    addEventListener() {}, scrollTo() {}, matchMedia: () => ({ matches: false }), URL
  };
  try {
    runInNewContext(runtime, {
      window: fixtureWindow, document: fixtureDocument, URL, Blob, TextEncoder, TextDecoder, Uint8Array,
      Intl, Date, Math, Number, String, Object, Array, Set, Map, RegExp, JSON, Error, Promise,
      console: { log() {}, warn() {}, error() {} },
      fetch: async () => { throw new Error("network disabled in validator fixture"); },
      atob, btoa, setTimeout, clearTimeout, setInterval, clearInterval
    }, { filename: "dashboard-runtime.js" });
    const hooks = fixtureWindow.__RID_TEST__;
    check(Boolean(hooks), "deterministic runtime hooks are exposed");
    const fixtureTexts = new Map([
      ["README.md", "# Example repository\n"],
      ["src/app.js", "export const ready = true;\n"],
      ["docs/guide.md", "> [!NOTE]\n> Runtime fixture note.\n"],
      ["data/config.json", "{\"enabled\":true}\n"],
      [".gitignore", "dist/\n"]
    ]);
    const fixtureFiles = [...fixtureTexts].map(([path, text]) => {
      const bytes = new TextEncoder().encode(text);
      const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
      return {
        path,
        sha: createHash("sha1").update(header).update(bytes).digest("hex"),
        size: bytes.byteLength,
        extension: hooks.extensionOf(path),
        area: path.includes("/") ? path.split("/")[0] : "(root)",
        binary: false, text, bytes, lines: hooks.textLineCount(text), objectType: "blob", source: "fixture"
      };
    });
    const analysis = hooks.analyzeRepository(fixtureFiles);
    check(analysis.files.length === fixtureFiles.length && analysis.totalBytes > 0, "runtime analyzes the exact fixture model");
    check(analysis.scores.roots.value === 100 && !analysis.issues.some((item) => item.code === "required-root"), "generic repository needs only a README entry point");
    check(analysis.scores.inbox.value === null && analysis.scores.provenance.value === null, "missing optional inbox and provenance evidence stays N/A");
    check(analysis.notes.length === 1, "runtime extracts Markdown notes from loaded bytes");
    const tree = hooks.buildFileTree(fixtureFiles);
    check(tree.fileCount === fixtureFiles.length && tree.directories.length === 3, "runtime tree aggregates exact descendant files");
    check(new Set(hooks.directoryPaths(tree)).size === 3, "runtime exposes deterministic unique directory paths");
    const schemaName = hooks.fileNameParts({ path: "schemas/example.schema.json", extension: ".schema.json" });
    const extensionless = hooks.fileNameParts({ path: ".gitignore", extension: "[no extension]" });
    check(schemaName.stem === "example" && schemaName.extensionLabel === ".schema.json" && extensionless.extensionLabel === "utan ändelse", "runtime separates filename and extension labels");
    check(/&lt;script&gt;/.test(hooks.renderMarkdown("<script>alert(1)</script>", "README.md")), "Markdown renderer escapes raw HTML");
  } catch (error) {
    check(false, "runtime fixture executes", error instanceof Error ? error.message : String(error));
  }

  check(!/<script\b[^>]*\bsrc\s*=/i.test(loaded.dashboard), "no external script dependency");
  check(!/<link\b[^>]*\brel\s*=\s*["']?stylesheet/i.test(loaded.dashboard), "no external stylesheet dependency");
  check(!/@import\s+(?:url\()?['"]?https?:/i.test(loaded.dashboard), "no remote CSS import");
  check(!/\bimport\s*\(\s*["']https?:/i.test(runtime), "no remote JavaScript import");
  check(!/\b(?:localStorage|sessionStorage|indexedDB|caches\.open|document\.cookie|serviceWorker\.register)\b/.test(runtime), "no browser persistence API");
  check(!/\bconsole\./.test(runtime), "runtime does not log repository or credential data");
  check(!/params\.get\(\s*["']token["']\s*\)/i.test(runtime), "token cannot enter through URL parameters");
  check(/\$\("#tokenInput"\)\.value\s*=\s*""/.test(runtime), "token form field is cleared after capture");
  check(/credentials:\s*"omit"/.test(runtime) && /cache:\s*"no-store"/.test(runtime) && /referrerPolicy:\s*"no-referrer"/.test(runtime), "GitHub reads omit cookies, cache, and referrer");
  check(/method:\s*"GET"/.test(runtime) && !/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(runtime), "runtime network method is read-only GET");
  check(/https:\/\/api\.github\.com/.test(runtime) && !/https:\/\/(?!api\.github\.com)[^\s'"`]+/.test(runtime), "runtime network destination is limited to GitHub API");
  check(/\/commits\/\$\{ref\}/.test(runtime) && /\/git\/trees\/\$\{treeSha\}\?recursive=1/.test(runtime) && /\/git\/blobs\/\$\{entry\.sha\}/.test(runtime), "GitHub adapter resolves commit, tree, and exact blobs");
  check(/POLL_INTERVAL_MS\s*=\s*60_000/.test(runtime) && /resolved\.headSha\s*===\s*state\.headSha/.test(runtime), "polling reloads only after head SHA changes");
  check(/showDirectoryPicker/.test(runtime) && /webkitdirectory/.test(loaded.dashboard), "local adapter has primary and fallback directory access");
  check(/bytes,\s*lines/.test(runtime) && /new Blob\(\[bytes\]/.test(runtime), "canonical model retains exact runtime bytes");
  check(/REQUIRED_ROOTS\s*=\s*\["README\.md"\]/.test(runtime), "generic entry-point contract does not require source-specific governance files");

  const requiredIds = [
    "appBrandName", "overviewKpis", "scoreList", "typeDonut", "phaseList", "directoryBars",
    "overviewNotes", "contentKpis", "recordTable", "areaTable", "qaCards", "inboxBadge", "inboxTable",
    "qualityScores", "evidenceBoundary", "issueList", "sourceKpis", "providerBars", "verificationDonut",
    "sourceGraph", "relationTable", "fileList", "filePreview", "expandAllDirectories",
    "collapseAllDirectories", "allNotes", "connectDialog"
  ];
  const missingIds = requiredIds.filter((id) => !new RegExp(`\\bid=["']${id}["']`).test(loaded.dashboard));
  check(missingIds.length === 0, "all dashboard surfaces exist", missingIds.join(", "));
  check(!/\b[0-9a-f]{40}\b/i.test(loaded.dashboard), "dashboard embeds no current commit SHA");
  check(!/\{\s*["'](?:record_id|source_relation_id|observed_ref|path)["']\s*:/i.test(loaded.dashboard), "dashboard embeds no repository record rows");
  check(/DEFAULT_SOURCE\s*=\s*Object\.freeze\(\{ owner: INSTALL_CONFIG\.owner, repo: INSTALL_CONFIG\.repo, ref: INSTALL_CONFIG\.ref \}\)/.test(runtime), "repository defaults derive only from installation configuration");
  check(/value="" placeholder="octocat"/.test(loaded.dashboard) && /value="" placeholder="hello-world"/.test(loaded.dashboard), "blank template fields expose neutral examples");
  check(/buildFileTree\(files\)/.test(runtime) && /buildFileTree\(filteredFiles\(\)\)/.test(runtime), "file tree derives from canonical runtime files and active filters");
  check(/role="tree"/.test(loaded.dashboard) && /role="treeitem"/.test(runtime) && /aria-expanded/.test(runtime), "file tree exposes accessible hierarchy and expansion state");
  check(/event\.key === "ArrowDown"/.test(runtime) && /event\.key === "ArrowRight"/.test(runtime) && /event\.key === "ArrowLeft"/.test(runtime), "file tree supports keyboard traversal and directory toggles");
  check(/data-directory-path/.test(runtime) && /setAllDirectories\(true\)/.test(runtime) && /setAllDirectories\(false\)/.test(runtime), "directory and global expand-collapse controls are wired");
  check(/escapeHtml/.test(runtime) && /renderMarkdown/.test(runtime) && !/<iframe\b/i.test(loaded.dashboard), "repository content stays on escaped non-iframe surfaces");
  check(/if\s*\(image\)\s*return hold\(`<span/.test(runtime), "Markdown images are not fetched or executed");

  for (const tag of ["style", "script", "dialog", "main", "body", "html"]) {
    const open = (loaded.dashboard.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
    const close = (loaded.dashboard.match(new RegExp(`</${tag}>`, "gi")) || []).length;
    check(open === close, `balanced <${tag}> tags`, `${open} open / ${close} close`);
  }

  const frontmatter = loaded.skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  check(Boolean(frontmatter), "skill has YAML frontmatter");
  const frontmatterKeys = frontmatter ? frontmatter[1].split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_-]*:/.test(line)).map((line) => line.split(":")[0]).sort() : [];
  check(JSON.stringify(frontmatterKeys) === JSON.stringify(["description", "name"]), "skill frontmatter has only name and description", frontmatterKeys.join(", "));
  check(/^name:\s*maintain-live-repository-dashboard\s*$/m.test(frontmatter?.[1] || ""), "skill name matches its directory");
  check(loaded.agents.includes(".agents/skills/maintain-live-repository-dashboard/SKILL.md") || loaded.agents.includes("maintain-live-repository-dashboard"), "root instructions preserve the dashboard maintenance contract");
  check(loaded.readme.includes("[MIT License](LICENSE)") && loaded.readme.includes("docs/INSTALLATION.sv.md"), "README links license and installation handoff");
  check(loaded.skill.includes("scripts/install.mjs") && loaded.skill.includes("scripts/configure.mjs") && loaded.skill.includes("npm run validate"), "skill governs installation, configuration, and verification");
  check(/127\.0\.0\.1/.test(loaded.server) && /Content-Security-Policy/.test(loaded.server) && /\["GET", "HEAD"\]/.test(loaded.server), "local server defaults to a constrained read-only surface");
  check(/Destination already exists/.test(loaded.installer) && /copyEntries/.test(loaded.installer), "installer copies an allowlist and refuses overwrite");
  check(forbiddenSecretOptions(loaded.configure) && forbiddenSecretOptions(loaded.installer), "helper CLIs reject credential-bearing options");

  const secretPatterns = [
    ["private key", new RegExp("-----BE" + "GIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")],
    ["GitHub classic token", new RegExp("\\bgh" + "p_[A-Za-z0-9]{30,}\\b")],
    ["GitHub fine-grained token", new RegExp("\\bgithub_" + "pat_[A-Za-z0-9_]{20,}\\b")],
    ["OpenAI-style secret", new RegExp("\\bsk" + "-[A-Za-z0-9]{20,}\\b")],
    ["AWS access key", new RegExp("\\bAK" + "IA[0-9A-Z]{16}\\b")],
    ["bearer credential", new RegExp("\\bBear" + "er\\s+[A-Za-z0-9._~+/=-]{20,}\\b")]
  ];
  const secretHits = [];
  for (const [file, content] of Object.entries(loaded)) {
    for (const [label, pattern] of secretPatterns) if (pattern.test(content)) secretHits.push(`${file}: ${label}`);
  }
  check(secretHits.length === 0, "dashboard package files contain no credential-shaped value", secretHits.join(", "));

  for (const item of passes) process.stdout.write(`[PASS] ${item.label}\n`);
  for (const item of failures) process.stderr.write(`[FAIL] ${item.label}${item.detail ? ` — ${item.detail}` : ""}\n`);
  process.stdout.write(`\n${passes.length} passed · ${failures.length} failed\n`);
  if (failures.length) process.exitCode = 1;
}

function forbiddenSecretOptions(content) {
  return /forbiddenOption/.test(content) && /token\|secret\|password/.test(content);
}

main().catch((error) => {
  process.stderr.write(`[ERROR] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
