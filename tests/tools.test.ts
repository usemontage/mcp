import { describe, expect, it, vi } from "vitest";
import type { MontageApiClient } from "../src/client.js";
import { handleConfigureAdapter, handleListAdapters } from "../src/tools/adapters.js";
import { handleGetArtifact, handleGetVersions, handleListArtifacts } from "../src/tools/artifacts.js";
import { handleListComponents } from "../src/tools/components.js";
import { handleGenerate } from "../src/tools/generate.js";

function fakeClient(): MontageApiClient {
  return {
    generate: vi.fn(async () => ({ id: "gen_1", html: "<html></html>", creditsUsed: 1 })),
    getArtifact: vi.fn(async () => ({ artifactId: "art_1" })),
    listArtifacts: vi.fn(async () => ({ artifacts: [] })),
    getVersions: vi.fn(async () => ({ artifactId: "art_1", versions: [] })),
    listComponents: vi.fn(async () => ({ data: [] })),
    configureAdapter: vi.fn(async () => ({ success: true })),
    listAdapters: vi.fn(async () => ({ data: [] })),
  } as unknown as MontageApiClient;
}

describe("tool handlers", () => {
  it("wraps generate as an MCP JSON result", async () => {
    const client = fakeClient();
    const result = await handleGenerate(client, { prompt: "Build", dataInfo: "{}" });

    expect(client.generate).toHaveBeenCalledWith({ prompt: "Build", dataInfo: "{}" });
    expect(result.structuredContent).toEqual({ id: "gen_1", html: "<html></html>", creditsUsed: 1 });
    expect(result.content[0].text).toContain("\"id\": \"gen_1\"");
  });

  it("wraps artifact tools", async () => {
    const client = fakeClient();

    await handleGetArtifact(client, { artifactId: "art_1" });
    await handleListArtifacts(client, { limit: 10 });
    await handleGetVersions(client, { artifactId: "art_1", limit: 5 });

    expect(client.getArtifact).toHaveBeenCalledWith("art_1");
    expect(client.listArtifacts).toHaveBeenCalledWith({ limit: 10 });
    expect(client.getVersions).toHaveBeenCalledWith("art_1", { limit: 5 });
  });

  it("wraps component and adapter tools", async () => {
    const client = fakeClient();

    await handleListComponents(client);
    await handleConfigureAdapter(client, { provider: "openai", apiKey: "sk-test" });
    await handleListAdapters(client);

    expect(client.listComponents).toHaveBeenCalledWith();
    expect(client.configureAdapter).toHaveBeenCalledWith({ provider: "openai", apiKey: "sk-test" });
    expect(client.listAdapters).toHaveBeenCalledWith();
  });
});

