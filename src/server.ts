import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MontageApiClient } from "./client.js";
import {
  ConfigureAdapterInputSchema,
  GenerateInputSchema,
  GetArtifactInputSchema,
  GetVersionsInputSchema,
  ListAdaptersInputSchema,
  ListArtifactsInputSchema,
  ListComponentsInputSchema,
  StreamInputSchema,
} from "./schemas.js";
import { handleConfigureAdapter, handleListAdapters } from "./tools/adapters.js";
import { handleGetArtifact, handleGetVersions, handleListArtifacts } from "./tools/artifacts.js";
import { handleListComponents } from "./tools/components.js";
import { handleGenerate } from "./tools/generate.js";
import { handleStream } from "./tools/stream.js";
import { errorResult, type ToolResult } from "./tools/result.js";

interface ToolRegistrar {
  registerTool(
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
      annotations?: {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        openWorldHint?: boolean;
      };
    },
    callback: (args: unknown) => Promise<ToolResult>,
  ): unknown;
}

export interface CreateServerOptions {
  apiKey: string;
  apiUrl?: string;
}

export function createMontageMcpServer(client: MontageApiClient): McpServer {
  const server = new McpServer({
    name: "montage",
    version: "0.1.0",
  });
  registerMontageTools(server as ToolRegistrar, client);
  return server;
}

export function registerMontageTools(server: ToolRegistrar, client: MontageApiClient): void {
  server.registerTool(
    "montage_generate",
    {
      title: "Generate Montage UI",
      description:
        "Generate a production UI artifact from a prompt and data context. Returns compiled HTML and artifact metadata.",
      inputSchema: GenerateInputSchema.shape,
      annotations: { openWorldHint: true },
    },
    withToolErrors((args) => handleGenerate(client, args as never)),
  );

  server.registerTool(
    "montage_stream",
    {
      title: "Stream Montage UI",
      description:
        "Generate a Montage UI artifact with progressive shell, slot, and final artifact events. Returns the raw stream events and final HTML.",
      inputSchema: StreamInputSchema.shape,
      annotations: { openWorldHint: true },
    },
    withToolErrors((args) => handleStream(client, args as never)),
  );

  server.registerTool(
    "montage_get_artifact",
    {
      title: "Get Montage Artifact",
      description: "Retrieve a generated Montage artifact by ID.",
      inputSchema: GetArtifactInputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    withToolErrors((args) => handleGetArtifact(client, args as never)),
  );

  server.registerTool(
    "montage_list_artifacts",
    {
      title: "List Montage Artifacts",
      description: "List generated Montage artifacts with optional pagination.",
      inputSchema: ListArtifactsInputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    withToolErrors((args) => handleListArtifacts(client, args as never)),
  );

  server.registerTool(
    "montage_get_versions",
    {
      title: "List Montage Artifact Versions",
      description: "List version history for a Montage artifact.",
      inputSchema: GetVersionsInputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    withToolErrors((args) => handleGetVersions(client, args as never)),
  );

  server.registerTool(
    "montage_list_components",
    {
      title: "List Montage Components",
      description: "List available Montage Atlas components.",
      inputSchema: ListComponentsInputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    withToolErrors((args) => handleListComponents(client, args as never)),
  );

  server.registerTool(
    "montage_configure_adapter",
    {
      title: "Configure Montage Adapter",
      description: "Configure a provider adapter, such as Supabase or Postgres, for Montage generation.",
      inputSchema: ConfigureAdapterInputSchema.shape,
      annotations: { destructiveHint: false, openWorldHint: true },
    },
    withToolErrors((args) => handleConfigureAdapter(client, args as never)),
  );

  server.registerTool(
    "montage_list_adapters",
    {
      title: "List Montage Adapters",
      description: "List configured Montage data adapters.",
      inputSchema: ListAdaptersInputSchema.shape,
      annotations: { readOnlyHint: true },
    },
    withToolErrors((args) => handleListAdapters(client, args as never)),
  );
}

export function createClientFromEnv(env: NodeJS.ProcessEnv = process.env): MontageApiClient {
  const apiKey = env.MONTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("MONTAGE_API_KEY environment variable is required.");
  }

  return new MontageApiClient({
    apiKey,
    baseUrl: env.MONTAGE_API_URL,
  });
}

export async function startStdioServer(options: CreateServerOptions): Promise<void> {
  const client = new MontageApiClient({
    apiKey: options.apiKey,
    baseUrl: options.apiUrl,
  });
  const server = createMontageMcpServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function withToolErrors(callback: (args: unknown) => Promise<ToolResult>) {
  return async (args: unknown): Promise<ToolResult> => {
    try {
      return await callback(args);
    } catch (error) {
      return errorResult(error);
    }
  };
}
