# Architecture and live-data contract

## One runtime model

Both adapters normalize loaded objects into one in-memory model containing the
repository-relative path, object/local blob SHA when available, exact byte
size, extension, top-level area, binary classification, decoded text and line
count for text files, original bytes, source mode, and optional local modified
time.

Every card, chart, table, score, finding, note, relation, directory node, and
preview is derived from that model. The HTML contains no repository inventory
or data snapshot.

## GitHub adapter

1. Resolve owner/repository/ref to an exact commit and tree SHA.
2. Read the recursive Git tree; recursively walk subtrees if GitHub truncates
   the response.
3. Fetch each non-tree object by its Git object SHA.
4. Decode and retain exact bytes in page memory.
5. Poll only the selected ref's head and reload after an actual SHA change.

All requests use `GET`, omit cookies, disable cache, and use a no-referrer
policy.

## Local adapter

File System Access is used when available. The directory handle lives only in
memory. The `webkitdirectory` fallback is retained and requires reselection for
a real refresh. Neither path writes to the repository.

## Optional semantic layers

The dashboard recognizes richer conventions when present:

- governed Markdown records with top-level frontmatter;
- `STATUS.md` phase tables;
- JSON/JSONL/CSV structures;
- source-relation JSONL rows;
- controlled `INBOX/` manifests and lifecycle evidence;
- Markdown admonitions and bounded action sections.

These are optional capabilities. Their absence must not be represented as a
verified source relationship or completed governance process.

## Installation configuration

`dashboard/index.html` contains one marked `INSTALL_CONFIG` object. The helper
scripts may set only application name, owner, repository, and ref. This config
contains no repository rows, current SHA, token, or content and is safe to
leave blank in a distributable package.
