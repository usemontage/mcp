import { describe, expect, it, vi } from "vitest";
import type { MontageApiClient } from "../src/client.js";
import { createClientFromEnv, registerMontageTools } from "../src/server.js";

describe("server registration", () => {
  it("registers all Montage MCP tools", () => {
    const registered: Array<{ name: string; config: { description?: string } }> = [];
    const registrar = {
      registerTool: vi.fn((name: string, config: { description?: string }) => {
        registered.push({ name, config });
      }),
    };

    registerMontageTools(registrar, {} as MontageApiClient);

    expect(registered.map((tool) => tool.name)).toEqual([
      "montage_generate",
      "montage_stream",
      "montage_get_artifact",
      "montage_list_artifacts",
      "montage_get_versions",
      "montage_list_components",
      "montage_configure_adapter",
      "montage_list_adapters",
    ]);
    expect(registrar.registerTool).toHaveBeenCalledTimes(8);
    expect(registered.every((tool) => tool.config.description)).toBe(true);
  });

  it("requires MONTAGE_API_KEY in the environment", () => {
    expect(() => createClientFromEnv({})).toThrow("MONTAGE_API_KEY");
    expect(() => createClientFromEnv({ MONTAGE_API_KEY: "mtg_sk_test" })).not.toThrow();
  });
});
