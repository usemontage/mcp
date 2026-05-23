# @montageai/mcp

MCP server for the Montage API. It exposes Montage generation, artifacts, components, and adapter configuration to Claude Desktop, Cursor, Windsurf, and any MCP-compatible client.

## Install

```bash
npm install -g @montageai/mcp
```

Or run it directly:

```bash
npx @montageai/mcp
```

## Environment

```bash
export MONTAGE_API_KEY=mtg_sk_...
export MONTAGE_API_URL=https://api.usemontage.ai
```

`MONTAGE_API_URL` is optional and only needed for local or staging APIs.

## Claude Desktop

```json
{
  "mcpServers": {
    "montage": {
      "command": "npx",
      "args": ["@montageai/mcp"],
      "env": {
        "MONTAGE_API_KEY": "mtg_sk_..."
      }
    }
  }
}
```

## Cursor and Windsurf

Use the same stdio command in your MCP configuration:

```json
{
  "montage": {
    "command": "npx",
    "args": ["@montageai/mcp"],
    "env": {
      "MONTAGE_API_KEY": "mtg_sk_..."
    }
  }
}
```

## Tools

- `montage_generate`: generate a production UI artifact from a prompt and optional data context.
- `montage_get_artifact`: retrieve an artifact by ID.
- `montage_list_artifacts`: list generated artifacts with `limit` and `offset`.
- `montage_get_versions`: list version history for an artifact.
- `montage_list_components`: list available Montage Atlas components.
- `montage_configure_adapter`: configure a provider adapter with `apiKey` or a provider-specific `config` object.
- `montage_list_adapters`: list configured adapters.

## One-call generation

Ask your MCP client to call:

```json
{
  "name": "montage_generate",
  "arguments": {
    "prompt": "Interactive fundraising pipeline for a startup CFO. Start empty. User can add investors, import CSV rows, filter by stage, and export visible rows.",
    "dataInfo": "{\"investors\":[]}",
    "interactive": true,
    "zeroed": true
  }
}
```

The tool returns JSON text and structured content from the Montage API, including generated HTML and artifact metadata.

