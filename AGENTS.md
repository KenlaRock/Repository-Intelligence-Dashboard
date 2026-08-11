# Repository Agent Instructions

## Purpose

This repository is a transferable installation base for a dependency-free,
read-only repository intelligence dashboard. It must remain neutral: no source
repository inventory, user identity, organization identity, current commit,
credential, or private content may be embedded in the application or package.
The standard project-level MIT license and contributor copyright notice are
the sole intentional attribution metadata in the transferable package.

These instructions apply to the whole repository. A nested `AGENTS.md` may add
stricter rules but may not weaken them.

## Required operating receipt

Before changing files, record:

```text
TARGET:
EXACT BASE:
CHANGE CLASS:
CURRENT STATE:
PROPOSED STATE:
INTENDED PATHS:
INVARIANTS:
EXCLUSIONS:
VERIFICATION:
AUTHORIZED OPERATIONS:
ROLLBACK:
STOP CONDITIONS:
```

## Runtime invariants

- Keep `dashboard/index.html` dependency-free and directly runnable.
- Build every path, byte count, metric, record, note, chart, table, finding,
  and preview from repository data loaded in the current browser session.
- Never embed repository file rows, file contents, inventory counts, catalog
  rows, current commit SHAs, or test snapshots in the dashboard.
- Keep GitHub access read-only and resolve a selected ref to an exact commit and
  tree before analysis.
- Keep local-folder observations clearly labelled as a working tree; do not
  claim a Git commit for local data.
- Build the collapsible directory tree from the canonical in-memory file model.
- Treat governance, provenance, inbox, and status features as optional. Missing
  optional conventions must produce `N/A` or an explanatory empty state, not a
  fabricated success.
- Treat all scores as diagnostics, never as approval, authority, license,
  security certification, or platform-state evidence.

## Installation configuration boundary

The only values the installer may embed are:

- display name;
- default GitHub owner;
- default repository name;
- default branch, tag, or commit ref.

All four values are connection configuration, not repository data. The owner
and repository may remain empty in the distributable template.

Never accept, write, print, persist, package, or commit a GitHub token, API key,
password, cookie, authorization header, or other secret. Runtime tokens may
exist only in page memory and must be cleared from the form immediately.

## Safe rendering and network behavior

- Escape repository-controlled text before inserting it into HTML or SVG.
- Never execute loaded HTML, SVG, Markdown HTML, scripts, event handlers, or
  repository payloads.
- Use `GET` only. Do not add mutations, uploads, issue writes, workflow
  dispatches, settings calls, or deployment calls.
- Do not add analytics, telemetry, service workers, browser persistence, remote
  fonts, CDNs, frameworks, or package dependencies.
- Keep exact downloaded bytes in memory only and revoke temporary object URLs.

## Coupled update rule

Changes to dashboard behavior must update, when applicable:

- `dashboard/index.html`;
- `.agents/skills/maintain-live-repository-dashboard/SKILL.md`;
- `.agents/skills/maintain-live-repository-dashboard/scripts/validate-dashboard.mjs`;
- installer/configuration scripts;
- README and affected documentation.

Run `npm run validate` before handing off or publishing the package. Report
browser or private-repository checks that were unavailable; absence is not a
pass.

## GitHub and deployment boundary

Local construction and validation do not authorize pushing, opening a pull
request, changing repository settings, publishing a site, or deploying the
dashboard. Treat each as a separate operation requiring explicit authorization.
