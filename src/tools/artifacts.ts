import type { MontageApiClient } from "../client.js";
import {
  GetArtifactInputSchema,
  GetVersionsInputSchema,
  ListArtifactsInputSchema,
  type GetArtifactInput,
  type GetVersionsInput,
  type ListArtifactsInput,
} from "../schemas.js";
import { jsonResult, type ToolResult } from "./result.js";

export async function handleGetArtifact(
  client: MontageApiClient,
  args: GetArtifactInput,
): Promise<ToolResult> {
  const input = GetArtifactInputSchema.parse(args);
  return jsonResult(await client.getArtifact(input.artifactId));
}

export async function handleListArtifacts(
  client: MontageApiClient,
  args: ListArtifactsInput,
): Promise<ToolResult> {
  const input = ListArtifactsInputSchema.parse(args);
  return jsonResult(await client.listArtifacts(input));
}

export async function handleGetVersions(
  client: MontageApiClient,
  args: GetVersionsInput,
): Promise<ToolResult> {
  const input = GetVersionsInputSchema.parse(args);
  return jsonResult(await client.getVersions(input.artifactId, { limit: input.limit }));
}

