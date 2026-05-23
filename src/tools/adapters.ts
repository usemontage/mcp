import type { MontageApiClient } from "../client.js";
import {
  ConfigureAdapterInputSchema,
  ListAdaptersInputSchema,
  type ConfigureAdapterInput,
} from "../schemas.js";
import { jsonResult, type ToolResult } from "./result.js";

export async function handleConfigureAdapter(
  client: MontageApiClient,
  args: ConfigureAdapterInput,
): Promise<ToolResult> {
  const input = ConfigureAdapterInputSchema.parse(args);
  return jsonResult(await client.configureAdapter(input));
}

export async function handleListAdapters(
  client: MontageApiClient,
  args: Record<string, never> = {},
): Promise<ToolResult> {
  ListAdaptersInputSchema.parse(args);
  return jsonResult(await client.listAdapters());
}

