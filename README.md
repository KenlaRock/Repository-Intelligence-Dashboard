# Repository Intelligence Dashboard — installation template

A neutral, dependency-free dashboard that reads a GitHub repository or a local
repository folder at runtime and turns the currently loaded bytes into a
read-only inventory, file tree, previews, diagnostics, KPIs, notes, tables,
graphs, and charts.

The distributable template contains no user, organization, repository,
inventory, commit, catalog, or content snapshot. A recipient supplies their own
repository when installing or when opening the app.

## What it does

- Resolves a GitHub branch, tag, or SHA to an exact commit and Git tree.
- Reads every blob with GitHub's read-only API and keeps exact bytes in memory.
- Opens a local repository folder without claiming Git commit parity.
- Shows a collapsible, filter-aware directory tree with visible filenames and
  extensions.
- Provides safe preview, raw text, metadata, and exact-byte download surfaces.
- Calculates repository statistics, content mix, structural QA, internal-link
  health, optional governance records, optional inbox evidence, source
  relations, notes, diagrams, and diagnostic scores from one runtime model.
- Polls the selected GitHub ref and reloads only when its head SHA changes.
- Works without a build step, framework, CDN, database, backend, or telemetry.

## Fastest start

Requirements for the helper scripts: Node.js 18 or later. The HTML application
itself has no Node.js dependency.

```bash
npm run validate
npm run serve
```

Open `http://127.0.0.1:4173/`, choose **GitHub Live** or a local repository
folder, and load the repository. You can also open
`dashboard/index.html` directly, although localhost gives browser folder APIs a
more predictable security context.

## Create a configured installation

The installer copies a clean application into a new directory, embeds only
non-secret connection defaults, validates the result, and can initialize a new
Git repository without creating a commit.

```bash
node scripts/install.mjs \
  --output ../my-repository-dashboard \
  --owner example-owner \
  --repo example-repository \
  --ref main \
  --name "Team Repository Dashboard" \
  --init-git
```

Omit `--owner` and `--repo` to create a completely blank installation. Never
pass a token to the installer. Private-repository tokens are entered only in
the running page and remain in memory for that tab.

Full instructions:

- [Installation](docs/INSTALLATION.md)
- [Installation på svenska](docs/INSTALLATION.sv.md)
- [Usage](docs/USAGE.md)
- [Architecture and data contract](docs/ARCHITECTURE.md)
- [Security](SECURITY.md)

## Reconfigure an existing copy

```bash
node scripts/configure.mjs \
  --owner another-owner \
  --repo another-repository \
  --ref main \
  --name "Repository Intelligence Dashboard"
```

Use empty values to return to a blank template:

```bash
node scripts/configure.mjs --owner "" --repo ""
```

## Validation

```bash
npm run validate
```

Validation checks the inline JavaScript, live-source contract, safe rendering,
read-only network behavior, tree interactions, generic configuration boundary,
documentation, installer, reconfiguration flow, and credential-shaped values.
It also installs a disposable copy and validates that copy.

## Important limits

- Repository scores are diagnostics, not security certification or approval.
- GitHub settings, branch protection, Actions, reviews, secrets, deployments,
  licenses, source identity, and external-link validity are outside file-only
  evidence unless a separately authorized adapter is added.
- A private repository normally requires a fine-grained GitHub token with only
  read access to that repository. The app does not create or store one.
- Very large repositories can be slow or hit GitHub API limits because exact
  blob bytes are intentionally loaded instead of using cached snapshot data.

## License choice

No redistribution license is selected by this template. Before publishing or
handing the application to third parties, review and complete
[`LICENSE.template`](LICENSE.template) with the license and copyright holder
you intend to use.

