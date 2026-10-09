# @propxchain/mcp-server

[![npm](https://img.shields.io/npm/v/@propxchain/mcp-server.svg)](https://www.npmjs.com/package/@propxchain/mcp-server)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)

MCP server for [PropXchain](https://propxchain.com), the UK platform for selling or buying a home: one shared, live record of the transaction for seller, buyer, conveyancer and estate agent. (Not Propchain/PROPC, the unrelated crypto token.)

Your AI assistant can join your transaction with its invite code, read status, checklists, documents and the audit trail, pull HM Land Registry and property data, explain each step, and draft messages to the other parties. Money and legal steps still wait for you.

## Connect (hosted, no install)

PropXchain runs this server for you at:

```
https://mcp.propxchain.com/mcp
```

- **claude.ai / Claude Desktop:** Settings, Connectors, Add custom connector, paste the URL, leave client ID and secret blank.
- **Claude Code:** `claude mcp add --transport http propxchain https://mcp.propxchain.com/mcp`
- **ChatGPT, Cursor and other MCP clients:** add a remote (Streamable HTTP) server with the URL above. Sign-in is OAuth 2.1, discovered automatically.

You approve the connection with your PropXchain email and a 6-digit code, then give your assistant a `TX-XXXX-XXXX` invite code. Remove it at any time from the transaction's bot panel.

Full setup walkthrough: [propxchain.com/agent](https://propxchain.com/agent).
Machine-readable manifest: [propxchain.com/.well-known/mcp.json](https://propxchain.com/.well-known/mcp.json).
Registry listing: [`server.json`](server.json) (`io.github.Madhatt4/propxchain`).

## Run it locally instead (stdio)

For hosts without remote MCP support. The local server generates its own Ed25519 keypair on first launch (stored on disk, never copied across boundaries); access is still per transaction via invite code.

```bash
npm install -g @propxchain/mcp-server
```

Then add to your Claude Desktop config (`%APPDATA%/Claude/claude_desktop_config.json` on Windows, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `~/.config/Claude/claude_desktop_config.json` on Linux):

```json
{
  "mcpServers": {
    "propxchain": {
      "command": "propxchain-mcp-server",
      "env": { "IC_NETWORK": "ic" }
    }
  }
}
```

For Claude Code, the equivalent single command is:

```bash
claude mcp add propxchain propxchain-mcp-server -e IC_NETWORK=ic
```

Restart your agent. In a new chat, ask:

> *Join propxchain transaction TX-XXXX-XXXX as a bot called "Claude Desktop"*

(Get the invite code from the share panel of any of your transactions on propxchain.com.)

## Identity model

On first launch, the server reads or creates an Ed25519 seed at:

- macOS / Linux: `~/.config/propxchain-mcp/identity.key` (or `$XDG_CONFIG_HOME/propxchain-mcp/identity.key` if set)
- Windows: `%APPDATA%/propxchain-mcp/identity.key`

The file is `chmod 600` on POSIX and contains a single base64-encoded 32-byte seed plus a trailing newline. The bot's principal is derived from this seed and printed to stderr at startup.

Override for ops or CI: set `BOT_PRIVATE_KEY` in env to a base64-encoded 32-byte seed. When set, the server uses this instead of reading from disk.

## Tools

17 tools across these categories:

| Category | Tools |
|---|---|
| Bot management | `propxchain_join_transaction_as_bot`, `propxchain_list_my_transactions`, `propxchain_list_connected_bots` |
| Transactions | `propxchain_search_transactions`, `propxchain_get_transaction`, `propxchain_get_status`, `propxchain_create_transaction`, `propxchain_join_transaction`, `propxchain_get_transaction_chain` |
| Documents | `propxchain_verify_document`, `propxchain_list_documents`, `propxchain_upload_document` |
| Checklists | `propxchain_get_checklist`, `propxchain_update_checklist` |
| Property intelligence | `propxchain_get_property_intel` |
| Education | `propxchain_explain_process`, `propxchain_send_message` |

Each tool's full schema is discoverable via the standard MCP `tools/list` call.

## Security model

- The bot principal only sees transactions the user has granted via invite code.
- No write surface for funds, signatures, or transactions outside the granted ones.
- Revocation is one click in the propxchain.com bot panel; calls `transaction_manager.disconnectBot` on chain.
- The seed file lives on the user's local machine. The npm package contains no credentials.
- npm provenance attestation is enabled on every release; verify with `npm view @propxchain/mcp-server`.

## Build from source

```bash
git clone https://github.com/Madhatt4/propxchain-mcp-server.git
cd propxchain-mcp-server
npm install
npm run build
```

`npm run build` compiles TypeScript and prepends a `#!/usr/bin/env node` shebang to `dist/index.js` (post-tsc, since tsc strips it). Test the binary directly:

```bash
node dist/index.js
```

The server reads/creates the local identity file as above. To smoke-test the MCP protocol roundtrip, pipe an `initialize` + `tools/list` request:

```bash
( printf '%s\n' \
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
    '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
    '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' ; \
  sleep 2 ) | node dist/index.js
```

You should see your bot principal in stderr and the tool list in stdout.

## Versioning

Releases are published manually via `gh workflow run release.yml --field dry-run=false`. Bump `version` in `package.json` first; the workflow refuses to republish an existing version and refuses pre-release suffixes on the `latest` tag. Pre-release validation runs the same MCP smoke test shown above before publishing.

## License

UNLICENSED. The npm package is freely installable for use against PropXchain canisters; redistribution and modification rights are not granted.
