---
"@buildpad/mcp": patch
---

MCP server: start when it is launched through a bin shim.

`npx -y @buildpad/mcp@latest` exited straight away with no output, which a client reports as `CONNECTION_CLOSED`. The check that decides whether the module is being run or imported compared `import.meta.url` with `process.argv[1]` as strings, and npx and pnpm expose a package's `bin` as a symlink: the two name the same file by different paths, so the server concluded it had been imported and did nothing.

It now compares the resolved real paths, which sees through the symlink, and falls back to the old comparison if either path cannot be resolved — a wrong answer there is the same silent, unexplained exit.
