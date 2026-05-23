import { beforeEach, describe, expect, it, vi } from "vitest";
import { MontageApiClient, MontageApiError } from "../src/client.js";

const mockFetch = vi.fn<typeof fetch>();

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("MontageApiClient", () => {
  let client: MontageApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new MontageApiClient({
      apiKey: "mtg_test_sk_xxx",
      baseUrl: "https://api.example.test/",
      fetchImpl: mockFetch,
    });
  });

  it("sends auth and normalizes generate dataInfo", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "gen_1", html: "<html></html>", creditsUsed: 3 }));

    await client.generate({ prompt: "Build a dashboard" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/generate");
    expect(opts?.method).toBe("POST");
    expect((opts?.headers as Record<string, string>).Authorization).toBe("Bearer mtg_test_sk_xxx");
    expect(JSON.parse(String(opts?.body))).toEqual({
      prompt: "Build a dashboard",
      dataInfo: "",
    });
  });

  it("routes artifact and metadata requests", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ artifactId: "art_1" }))
      .mockResolvedValueOnce(jsonResponse({ artifacts: [] }))
      .mockResolvedValueOnce(jsonResponse({ versions: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    await client.getArtifact("art_1");
    await client.listArtifacts({ limit: 10, offset: 20 });
    await client.getVersions("art_1", { limit: 5 });
    await client.listComponents();
    await client.configureAdapter({
      provider: "supabase",
      config: { url: "https://example.supabase.co", serviceRoleKey: "secret" },
    });
    await client.listAdapters();

    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/v1/artifacts/art_1",
      "https://api.example.test/v1/artifacts?limit=10&offset=20",
      "https://api.example.test/v1/artifacts/art_1/versions?limit=5",
      "https://api.example.test/v1/components",
      "https://api.example.test/v1/adapters/supabase",
      "https://api.example.test/v1/adapters",
    ]);
    expect(JSON.parse(String(mockFetch.mock.calls[4][1]?.body))).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "secret",
    });
  });

  it("throws structured API errors", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    ));

    await expect(client.generate({ prompt: "Build" })).rejects.toMatchObject({
      name: "MontageApiError",
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    } satisfies Partial<MontageApiError>);
  });
});

