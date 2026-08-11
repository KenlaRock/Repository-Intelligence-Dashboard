# Installation

## Option A — use the blank template directly

1. Extract the package into a normal local directory.
2. Install Node.js 18 or later if you want the validation and local-server
   helpers. Node.js is not required for the HTML itself.
3. Run `npm run validate`.
4. Run `npm run serve`.
5. Open `http://127.0.0.1:4173/`.
6. Choose **GitHub Live** or **Local repo-root** in the page.

Opening `dashboard/index.html` directly is also supported. Serving it on
localhost is recommended because browser folder-access features are more
consistent in a secure context.

## Option B — create a configured copy

From the unpacked template:

```bash
node scripts/install.mjs \
  --output ../my-repository-dashboard \
  --owner example-owner \
  --repo example-repository \
  --ref main \
  --name "Team Repository Dashboard" \
  --init-git
```

The destination must not exist. The installer deliberately refuses overwrite
mode: a reusable installation base should not quietly eat an existing directory
because someone mistyped a path.

The installer:

1. copies only the application, instructions, validator, and helper scripts;
2. embeds the display name and optional GitHub owner/repository/ref;
3. rejects token-, secret-, and password-shaped CLI options;
4. validates the installed copy;
5. optionally runs `git init -b main` without staging or committing files.

Omit `--owner` and `--repo` to keep the new installation blank. They must be
provided together when used.

## Supported installer options

| Option | Meaning |
|---|---|
| `--output <path>` | New destination directory. Required. |
| `--owner <name>` | Optional default GitHub owner. |
| `--repo <name>` | Optional default repository name. |
| `--ref <ref>` | Optional default branch, tag, or SHA; defaults to `main`. |
| `--name <text>` | Application display name. |
| `--init-git` | Initialize a fresh Git repository in the copy. |
| `--help` | Show CLI help. |

Tokens are intentionally not valid installer options.

## Private repositories

Create a fine-grained GitHub token in the recipient's own GitHub account with
access only to the intended private repository and read-only repository
contents/metadata. Enter it in the running page. Do not put it in a command,
file, URL, environment example, or hosted configuration.

## Static hosting

The app consists of static files. Any static host can serve the package, with
`dashboard/index.html` as the application entry point. Hosting and repository
access are separate: publishing the page does not authorize repository access,
and no deployment is performed by the installer.

The project is distributed under the MIT License. Keep the root `LICENSE` file
with redistributed copies or substantial portions of the software.
