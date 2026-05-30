import http from "node:http";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const DEMO_HTML =
  '<!doctype html><html><body><main data-demo="montage-agent" data-surface="mcp-fixture"><h1>MCP smoke fixture</h1><p>This fixture only proves local MCP transport.</p><button data-action="refresh">Refresh</button></main></body></html>';

interface MatrixRow {
  package: string;
  surface: string;
  result: string;
}

async function createMockApi(): Promise<{ apiUrl: string; close: () => Promise<void> }> {
  const adapters = new Map<string, Record<string, unknown>>();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const method = req.method ?? "GET";

    if (method === "POST" && url.pathname === "/v1/generate") {
      const body = await readJson(req);
      if (body.streaming === true) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        for (const event of [
          { type: "status", text: "MCP smoke fixture stream" },
          { type: "shell", html: '<main data-mtg-stream-slots><section data-mtg-stream-slot="workspace"></section></main>' },
          { type: "slot", slot: "workspace", html: "<article>MCP fixture slot</article>" },
          {
            type: "done",
            id: "gen_demo_1",
            artifactId: "art_demo_1",
            creditsUsed: 0,
            html: DEMO_HTML,
          },
        ]) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        res.end();
        return;
      }
      sendJson(res, {
        id: "gen_demo_1",
        artifactId: "art_demo_1",
        version: "v1",
        html: DEMO_HTML,
        creditsUsed: 0,
      });
      return;
    }

    if (method === "GET" && url.pathname === "/v1/artifacts") {
      sendJson(res, { artifacts: [{ id: "art_demo_1", html: DEMO_HTML }] });
      return;
    }

    if (method === "GET" && url.pathname === "/v1/artifacts/art_demo_1") {
      sendJson(res, { id: "art_demo_1", html: DEMO_HTML, version: "v1" });
      return;
    }

    if (method === "GET" && url.pathname === "/v1/artifacts/art_demo_1/versions") {
      sendJson(res, { versions: [{ version: "v1", html: DEMO_HTML }] });
      return;
    }

    if (method === "GET" && url.pathname === "/v1/components") {
      sendJson(res, { data: [{ id: "table", name: "Table", type: "table" }] });
      return;
    }

    if (method === "GET" && url.pathname === "/v1/adapters") {
      sendJson(res, { data: Array.from(adapters.values()) });
      return;
    }

    if (method === "PUT" && url.pathname.startsWith("/v1/adapters/")) {
      const provider = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      const body = await readJson(req);
      adapters.set(provider, {
        provider,
        configuredAt: "2026-05-23T00:00:00.000Z",
        keys: Object.keys(body),
      });
      sendJson(res, { success: true });
      return;
    }

    sendJson(res, { error: { code: "not_found", message: `${method} ${url.pathname}` } }, 404);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Mock API did not expose a TCP port.");
  }

  return {
    apiUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) as Record<string, unknown> : {};
}

function sendJson(res: http.ServerResponse, body: unknown, status = 200): void {
  const raw = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": String(raw.length),
  });
  res.end(raw);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function record(rows: MatrixRow[], surface: string, fn: () => Promise<string> | string): Promise<void> {
  try {
    const result = await fn();
    rows.push({ package: "@montageai/mcp", surface, result: `PASS ${result}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    rows.push({ package: "@montageai/mcp", surface, result: `FAIL ${message}` });
  }
}

function structured(result: unknown): Record<string, unknown> {
  if (result && typeof result === "object" && "structuredContent" in result) {
    return (result as { structuredContent: Record<string, unknown> }).structuredContent;
  }
  throw new Error("MCP result did not include structuredContent.");
}

function printMatrix(rows: MatrixRow[]): void {
  const packageWidth = Math.max("Package".length, ...rows.map((row) => row.package.length));
  const surfaceWidth = Math.max("Surface".length, ...rows.map((row) => row.surface.length));
  console.log(`${"Package".padEnd(packageWidth)}  ${"Surface".padEnd(surfaceWidth)}  Result`);
  console.log(`${"-".repeat(packageWidth)}  ${"-".repeat(surfaceWidth)}  ------`);
  for (const row of rows) {
    console.log(`${row.package.padEnd(packageWidth)}  ${row.surface.padEnd(surfaceWidth)}  ${row.result}`);
  }
}

const mockApi = await createMockApi();
const rows: MatrixRow[] = [];
const serverPath = fileURLToPath(new URL("../../dist/index.js", import.meta.url));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  env: {
    ...process.env,
    MONTAGE_API_KEY: "mtg_demo_key",
    MONTAGE_API_URL: mockApi.apiUrl,
  },
});
const client = new Client({ name: "montage-mcp-agent-proof", version: "0.1.0" });

try {
  await client.connect(transport);
  await delay(20);

  await record(rows, "listTools", async () => {
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    assert(names.length === 8, `expected 8 tools, received ${names.length}`);
    assert(names.includes("montage_generate"), "montage_generate not listed");
    assert(names.includes("montage_stream"), "montage_stream not listed");
    return "8 tools";
  });

  await record(rows, "montage_generate", async () => {
    const result = structured(await client.callTool({
      name: "montage_generate",
      arguments: { prompt: "Build a startup ops app", dataInfo: '{"deals":[]}' },
    }));
    assert(result.id === "gen_demo_1", "generate id mismatch");
    assert(String(result.html).includes('data-demo="montage-agent"'), "generate HTML missing demo marker");
    return String(result.id);
  });

  await record(rows, "montage_stream", async () => {
    const result = structured(await client.callTool({
      name: "montage_stream",
      arguments: {
        prompt: "Show me a startup ops dashboard with pipeline actions.",
        dataInfo: '{"deals":[]}',
        interactive: true,
        includeHtml: true,
        requiredCapabilities: ["startup_data_query", "export_csv"],
      },
    }));
    assert(Array.isArray(result.events), "stream events missing");
    assert(String(result.html).includes('data-demo="montage-agent"'), "stream HTML missing demo marker");
    if (process.env.MONTAGE_MCP_PROOF_ARTIFACT_PATH) {
      await writeFile(process.env.MONTAGE_MCP_PROOF_ARTIFACT_PATH, String(result.html));
    }
    if (process.env.MONTAGE_MCP_PROOF_EVENTS_PATH) {
      await writeFile(process.env.MONTAGE_MCP_PROOF_EVENTS_PATH, JSON.stringify(result.events, null, 2));
    }
    return `${(result.events as unknown[]).length} events`;
  });

  await record(rows, "montage_list_artifacts", async () => {
    const result = structured(await client.callTool({ name: "montage_list_artifacts", arguments: {} }));
    assert(Array.isArray(result.artifacts), "artifact list missing");
    return "art_demo_1";
  });

  await record(rows, "montage_get_artifact", async () => {
    const result = structured(await client.callTool({
      name: "montage_get_artifact",
      arguments: { artifactId: "art_demo_1" },
    }));
    assert(result.id === "art_demo_1", "artifact id mismatch");
    return String(result.id);
  });

  await record(rows, "montage_get_versions", async () => {
    const result = structured(await client.callTool({
      name: "montage_get_versions",
      arguments: { artifactId: "art_demo_1" },
    }));
    assert(Array.isArray(result.versions), "versions missing");
    return "v1";
  });

  await record(rows, "montage_list_components", async () => {
    const result = structured(await client.callTool({ name: "montage_list_components", arguments: {} }));
    assert(Array.isArray(result.data), "components missing");
    return "table";
  });

  await record(rows, "montage_configure_adapter", async () => {
    const result = structured(await client.callTool({
      name: "montage_configure_adapter",
      arguments: { provider: "openai", apiKey: "sk_demo" },
    }));
    assert(result.success === true, "adapter configure failed");
    return "openai";
  });

  await record(rows, "montage_list_adapters", async () => {
    const result = structured(await client.callTool({ name: "montage_list_adapters", arguments: {} }));
    assert(Array.isArray(result.data), "adapters missing");
    return "openai";
  });

  printMatrix(rows);
} finally {
  await client.close();
  await mockApi.close();
}

if (rows.some((row) => row.result.startsWith("FAIL"))) {
  process.exitCode = 1;
}

if (process.env.MONTAGE_MCP_PROOF_ARTIFACT_PATH && !process.env.MONTAGE_MCP_PROOF_EVENTS_PATH) {
  await writeFile(process.env.MONTAGE_MCP_PROOF_ARTIFACT_PATH, DEMO_HTML);
}
