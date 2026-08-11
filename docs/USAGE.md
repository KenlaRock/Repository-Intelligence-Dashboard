# Usage

## GitHub Live

1. Open the connection dialog.
2. Enter the GitHub owner, repository, and branch/tag/SHA.
3. For a private repository, enter a fine-grained read-only token in the page.
4. Select **Read repository**.

The app resolves the ref to an exact commit, reads its recursive Git tree, and
loads every non-tree object by blob SHA. The header shows the exact commit and
tree evidence boundary. Once per minute, the app compares the selected ref's
head and reloads only after its SHA changes.

## Local repo-root

Choose a local repository folder. The app reads the current working-tree bytes
and excludes `.git` and common dependency/build/cache directories. Local mode
does not claim a Git commit or equivalence with a remote branch.

Some browsers require localhost or HTTPS for direct directory handles. The
fallback folder picker remains available but requires choosing the folder again
to refresh changed bytes.

## Views

- **Overview:** repository size, file/content mix, optional status phases,
  diagnostics, and highlighted notes.
- **Content:** areas, formats, optional governed records, optional inbox rows,
  and full live inventory summaries.
- **Quality:** parsing, metadata, internal links, Markdown fences, credential
  patterns, entry-point coverage, and evidence limits.
- **Sources:** optional JSONL source relations and a runtime-built diagram.
- **Explorer:** collapsible/filterable directory tree, filename/extension,
  preview, raw, metadata, and exact-byte download.
- **Notes:** Markdown admonitions and bounded action headings.

## File-tree keyboard controls

- `Arrow Up` / `Arrow Down`: previous or next visible item.
- `Arrow Right`: expand a directory or enter its first visible child.
- `Arrow Left`: collapse a directory or move to its parent.
- `Home` / `End`: first or last visible tree item.

## URL defaults

Non-secret connection defaults can be supplied in a URL:

```text
?owner=example-owner&repo=example-repository&ref=main&autoload=1
```

Never add a token to a URL. URLs can be stored in browser history, server logs,
messages, and screenshots.

## Reading scores correctly

Scores describe only the checks performed against currently loaded files. An
excellent score does not prove repository security, review quality, licensing,
deployment state, source identity, or that external links are valid.
