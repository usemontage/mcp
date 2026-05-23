import type { MontageApiClient } from "../client.js";
import { GenerateInputSchema, type GenerateInput } from "../schemas.js";
import { jsonResult, type ToolResult } from "./result.js";

export async function handleGenerate(
  client: MontageApiClient,
  args: GenerateInput,
): Promise<ToolResult> {
  const input = GenerateInputSchema.parse(args);
  const result = await client.generate(input);
  return jsonResult(result);
}

