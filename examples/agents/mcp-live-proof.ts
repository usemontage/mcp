import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function structured(result: unknown): Record<string, unknown> {
  if (result && typeof result === "object" && "structuredContent" in result) {
    return (result as { structuredContent: Record<string, unknown> }).structuredContent;
  }
  throw new Error("MCP result did not include structuredContent.");
}

const artifactPath = process.env.MONTAGE_MCP_PROOF_ARTIFACT_PATH;
const eventsPath = process.env.MONTAGE_MCP_PROOF_EVENTS_PATH;
if (!artifactPath || !eventsPath) {
  throw new Error("MONTAGE_MCP_PROOF_ARTIFACT_PATH and MONTAGE_MCP_PROOF_EVENTS_PATH are required.");
}

const serverPath = fileURLToPath(new URL("../../dist/index.js", import.meta.url));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  env: {
    ...process.env,
    MONTAGE_API_URL: process.env.MONTAGE_API_URL || "https://api.usemontage.ai",
  },
});
const client = new Client({ name: "montage-mcp-live-proof", version: "0.1.0" });

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name);
  assert(names.includes("montage_stream"), "montage_stream not listed");

  const result = structured(await client.callTool({
    name: "montage_stream",
    arguments: {
      prompt: "Show me a startup ops dashboard with pipeline actions.",
      dataInfo: JSON.stringify({
        surface: "mcp",
        emptyState: true,
        capabilities: ["startup_data_query", "export_csv"],
      }),
      interactive: true,
      includeHtml: true,
      zeroed: true,
      requiredCapabilities: ["startup_data_query", "export_csv"],
    },
  }));

  assert(Array.isArray(result.events), "stream events missing");
  assert(typeof result.html === "string" && result.html.length > 0, "stream final HTML missing");
  await writeFile(artifactPath, result.html);
  await writeFile(eventsPath, JSON.stringify(result.events, null, 2));
  console.log(`PASS mcp-live ${result.events.length} events ${String(result.html).length} html chars`);
} finally {
  await client.close();
}
