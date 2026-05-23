import { describe, expect, it } from "vitest";
import {
  ConfigureAdapterInputSchema,
  GenerateInputSchema,
  GetArtifactInputSchema,
  GetVersionsInputSchema,
  ListAdaptersInputSchema,
  ListArtifactsInputSchema,
  ListComponentsInputSchema,
} from "../src/schemas.js";

describe("MCP input schemas", () => {
  it("accepts minimal generate input for one-call UI generation", () => {
    expect(GenerateInputSchema.safeParse({ prompt: "Build a dashboard" }).success).toBe(true);
  });

  it("accepts full generate input", () => {
    const result = GenerateInputSchema.safeParse({
      prompt: "Revenue pipeline",
      dataInfo: "{\"deals\":[]}",
      data: { deals: [] },
      designSystem: { theme: "dark", colors: { primary: "#6161fd" } },
      backendType: "fluxAOT",
      interactive: true,
      hosted: true,
      strictData: true,
      requiredFields: ["firm", "stage"],
      requiredCapabilities: ["importCsv"],
      cache: "read-write",
      zeroed: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects generate input without a prompt", () => {
    expect(GenerateInputSchema.safeParse({ dataInfo: "{}" }).success).toBe(false);
  });

  it("validates artifact schemas", () => {
    expect(GetArtifactInputSchema.safeParse({ artifactId: "art_123" }).success).toBe(true);
    expect(ListArtifactsInputSchema.safeParse({ limit: 25, offset: 0 }).success).toBe(true);
    expect(GetVersionsInputSchema.safeParse({ artifactId: "art_123", limit: 10 }).success).toBe(true);
  });

  it("validates component and adapter schemas", () => {
    expect(ListComponentsInputSchema.safeParse({}).success).toBe(true);
    expect(ListAdaptersInputSchema.safeParse({}).success).toBe(true);
    expect(ConfigureAdapterInputSchema.safeParse({ provider: "supabase" }).success).toBe(false);
    expect(
      ConfigureAdapterInputSchema.safeParse({
        provider: "supabase",
        config: { url: "https://example.supabase.co", serviceRoleKey: "secret" },
      }).success,
    ).toBe(true);
    expect(
      ConfigureAdapterInputSchema.safeParse({ provider: "openai", apiKey: "sk-test" }).success,
    ).toBe(true);
  });
});

