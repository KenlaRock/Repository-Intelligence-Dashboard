# Security model

## Read-only boundary

The dashboard uses GitHub `GET` requests only. It does not create, update, or
delete repository content, issues, pull requests, workflows, releases,
settings, deployments, or access controls.

Local-folder mode reads files selected by the user. It does not write to the
folder and excludes technical directories such as `.git`, `node_modules`, and
common build/cache outputs.

## Token handling

For a private repository, use a fine-grained GitHub personal access token with
the smallest practical scope: access only to the selected repository and
read-only repository contents/metadata.

The token:

- is captured from a password field;
- is immediately removed from the form;
- remains only in JavaScript memory for the current tab;
- is never placed in a URL, file, export, log, DOM result, browser storage,
  cookie, cache, service worker, installer argument, or committed config;
- is cleared when the page unloads.

Do not send tokens in chat, issue text, pull requests, screenshots, command
history, configuration files, or support bundles.

## Untrusted repository content

Repository content is data, not code. The dashboard escapes repository-derived
values, uses a restricted Markdown renderer, refuses raw HTML execution, does
not load Markdown images, and never executes loaded HTML or SVG. Supported
binary images are previewed through temporary in-memory object URLs.

Credential-pattern findings report only the pattern class, path, and line. A
matched value must never be displayed or copied.

## Hosting

The bundled local server binds to `127.0.0.1` by default, serves `GET`/`HEAD`
only, disables caching, and adds a restrictive Content Security Policy. Do not
bind it to a public interface unless you understand the network exposure and
have added an appropriate access layer.

Static hosting makes the dashboard page public even when the repository being
inspected is private. That does not expose the repository by itself, but anyone
who can open the page can use the client. Never bake credentials into a hosted
copy.

## Reporting a problem

Report the behavior and affected path without including credentials, private
repository bytes, or authorization headers. Revoke a possibly exposed token in
GitHub immediately; deleting it from a file or history does not prove
revocation.
