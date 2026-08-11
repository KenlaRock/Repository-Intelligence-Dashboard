---
name: maintain-live-repository-dashboard
description: Maintain, configure, install, or review the neutral dependency-free live repository dashboard, its read-only data adapters, runtime metrics, safe previews, compatibility, and validation.
---

# Maintain the live repository dashboard

Use this skill for changes to `dashboard/index.html`, source adapters, runtime
repository models, diagnostic scores, visualizations, content explorer,
installer/configuration scripts, or dashboard validation.

Read the root `AGENTS.md` and record its operating receipt before editing.

## Preserve the distribution contract

- Keep one dependency-free, directly runnable HTML artifact.
- Derive all repository data and diagnostics only from bytes loaded in the
  current browser session.
- Keep the distributable template blank. Do not embed a user, organization,
  repository, inventory, current SHA, path list, metric result, record row,
  catalog row, or file content.
- Limit install-time configuration to application name, GitHub owner,
  repository, and ref. Owner and repository may both be empty.
- Never accept or persist credentials in an installer, configuration file,
  command example, URL, browser store, log, export, package, or commit.
- Keep all repository access read-only.

Stop if a request requires a database, background service, committed token,
OAuth application, GitHub setting, workflow, deployment, telemetry service, or
write API. Treat that as a separate risk domain requiring explicit approval.

## Maintain both runtime adapters

### GitHub Live

1. Resolve the selected ref to an exact commit and tree.
2. Read the recursive Git tree and walk subtrees if the response is truncated.
3. Fetch every non-tree Git object by SHA.
4. Decode and retain exact bytes in page memory.
5. Label claims with the resolved commit and tree.
6. Poll the selected ref's head and reload only after its commit changes.

Use `GET`, `credentials: "omit"`, `cache: "no-store"`, and a no-referrer
policy. A fine-grained read-only token may live only in page memory for the
current tab. Clear the password field immediately after capture.

### Local repo-root

Prefer File System Access when available and keep the directory handle in
memory. Retain `webkitdirectory` as fallback. Exclude technical directories,
label the result as a local working tree, and never infer a Git head.

## Keep one canonical in-memory model

Normalize each loaded object to path, SHA when available, exact size,
extension, top-level area, binary classification, decoded text/line count,
original bytes, source mode, and optional local modified time.

Build every view from this model. Directory nodes may aggregate descendant
counts and bytes but may not become a second inventory. Keep expand/collapse
state session-only, retain matching ancestors during filtering, show filenames
and extensions separately, and route file selection to safe preview, raw,
metadata, and exact-byte download.

## Treat richer repository conventions as optional

The dashboard may recognize governed frontmatter records, `STATUS.md` phase
tables, source-relation JSONL rows, controlled `INBOX/` manifests, and Markdown
admonitions. Their absence is normal in a general repository. Return `N/A` or a
clear empty state where evidence is unavailable; never convert missing data
into a perfect provenance or inbox score.

The only universal entry-point recommendation is `README.md`. Optional files
such as `AGENTS.md`, `CONTRIBUTING.md`, and `STATUS.md` must not make an otherwise
ordinary repository appear structurally broken.

## Render untrusted content safely

- Escape every repository-derived value before HTML or SVG insertion.
- Use the restricted escaped Markdown renderer.
- Do not honor raw HTML, event handlers, iframes, remote images, or arbitrary
  URI schemes.
- Never execute loaded HTML or SVG.
- Preview supported binary images through temporary object URLs and revoke
  them.
- Report credential findings by pattern class, path, and line only.

## Maintain installer safety

`scripts/install.mjs` must copy an allowlisted package into a new destination,
refuse overwrites, configure only non-secret defaults, validate the result, and
optionally initialize an empty Git repository without committing.

`scripts/configure.mjs` must update exactly one marked installation-config
object and reject token-, secret-, password-, authorization-, and API-key
options. Validate values before writing and prevent script-markup injection.

`scripts/serve.mjs` must bind to loopback by default, serve only `GET`/`HEAD`,
prevent path traversal, disable caching, and set restrictive security headers.

## Preserve compatibility and accessibility

Support current Chromium desktop and Android layouts without a build step.
Keep the mobile navigation usable, touch targets practical, tree keyboard
navigation intact, controls labelled, progress bars accessible, and reduced
motion respected. Keep File System Access feature-detected and retain the
folder-input fallback.

## Update and verify

1. Pin the source and record intended paths and exclusions.
2. Make the smallest coupled dashboard, skill, validator, installer, and docs
   edit required by the changed contract.
3. Add deterministic fixtures for parser or metric changes.
4. Run `npm run validate`.
5. Test a blank installation and a configured installation.
6. Exercise GitHub Live when authorized and a local repo-root.
7. Inspect desktop and narrow-mobile behavior in a real browser when available.
8. Test navigation, filters, tree expansion, preview/raw/metadata, downloads,
   refresh behavior, dialog errors, and local fallback.
9. Scan the complete package for source-user identifiers, source-repository
   identifiers, current SHAs, credentials, persistence APIs, write methods,
   unsafe rendering, and external dependencies.

Report unavailable browser, private-repository, external-link, and platform
checks honestly. Do not claim that a missing check passed.
