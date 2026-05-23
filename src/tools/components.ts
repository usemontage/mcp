import type { MontageApiClient } from "../client.js";
import { ListComponentsInputSchema } from "../schemas.js";
import { jsonResult, type ToolResult } from "./result.js";

export async function handleListComponents(
  client: MontageApiClient,
  args: Record<string, never> = {},
): Promise<ToolResult> {
  ListComponentsInputSchema.parse(args);
  return jsonResult(await client.listComponents());
}

