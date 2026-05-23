import type {
  ConfigureAdapterInput,
  GenerateInput,
  GetVersionsInput,
  ListArtifactsInput,
} from "./schemas.js";

const DEFAULT_BASE_URL = "https://api.usemontage.ai";

type FetchLike = typeof fetch;
type HttpMethod = "GET" | "POST" | "PUT";

export interface MontageApiClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}

export class MontageApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options: { status: number; code?: string; details?: unknown }) {
    super(message);
    this.name = "MontageApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export class MontageApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: MontageApiClientOptions | string, baseUrl?: string) {
    if (typeof options === "string") {
      this.apiKey = options;
      this.baseUrl = normalizeBaseUrl(baseUrl ?? DEFAULT_BASE_URL);
      this.fetchImpl = fetch;
      return;
    }

    this.apiKey = options.apiKey;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(input: GenerateInput): Promise<Record<string, unknown>> {
    const body = {
      ...input,
      dataInfo: input.dataInfo ?? "",
    };
    return this.request<Record<string, unknown>>("POST", "/v1/generate", { body });
  }

  async getArtifact(artifactId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", `/v1/artifacts/${encodeURIComponent(artifactId)}`);
  }

  async listArtifacts(params: ListArtifactsInput = {}): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/v1/artifacts", {
      query: toQuery(params),
    });
  }

  async getVersions(artifactId: string, params: Omit<GetVersionsInput, "artifactId"> = {}): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(
      "GET",
      `/v1/artifacts/${encodeURIComponent(artifactId)}/versions`,
      { query: toQuery(params) },
    );
  }

  async listComponents(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/v1/components");
  }

  async configureAdapter(input: ConfigureAdapterInput): Promise<Record<string, unknown>> {
    const body = input.config ? { ...input.config } : {};
    if (input.apiKey) {
      body.apiKey = input.apiKey;
    }
    return this.request<Record<string, unknown>>(
      "PUT",
      `/v1/adapters/${encodeURIComponent(input.provider)}`,
      { body },
    );
  }

  async listAdapters(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/v1/adapters");
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: { query?: URLSearchParams; body?: unknown } = {},
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const response = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const data = await readResponseBody(response);
    if (!response.ok) {
      throw toApiError(response.status, data);
    }
    return data as T;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string, query?: URLSearchParams): string {
  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    for (const [key, value] of query) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function toQuery(params: Record<string, unknown>): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  }
  return query;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toApiError(status: number, data: unknown): MontageApiError {
  if (isRecord(data)) {
    const nested = isRecord(data.error) ? data.error : undefined;
    const code = stringValue(nested?.code) ?? stringValue(data.code);
    const message =
      stringValue(nested?.message) ??
      stringValue(nested?.title) ??
      stringValue(data.error) ??
      stringValue(data.message) ??
      stringValue(data.title) ??
      `Montage API request failed with HTTP ${status}`;
    return new MontageApiError(message, { status, code, details: data });
  }

  return new MontageApiError(
    typeof data === "string" && data.length > 0
      ? data
      : `Montage API request failed with HTTP ${status}`,
    { status, details: data },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

