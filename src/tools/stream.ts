import type { MontageApiClient } from "../client.js";
import { StreamInputSchema, type StreamInput } from "../schemas.js";
import { jsonResult, type ToolResult } from "./result.js";

export async function handleStream(
  client: MontageApiClient,
  args: StreamInput,
): Promise<ToolResult> {
  const input = StreamInputSchema.parse(args);
  const result = await client.stream(input);
  return jsonResult(result);
}
