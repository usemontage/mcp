export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: TextContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: toStructuredContent(data),
  };
}

export function errorResult(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status: unknown }).status)
    : undefined;
  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code: unknown }).code
    : undefined;

  return {
    content: [{ type: "text", text: message }],
    structuredContent: {
      success: false,
      error: {
        message,
        ...(Number.isFinite(status) ? { status } : {}),
        ...(typeof code === "string" ? { code } : {}),
      },
    },
    isError: true,
  };
}

function toStructuredContent(data: unknown): Record<string, unknown> {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { result: data };
}

