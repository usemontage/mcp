import { z } from "zod";

export const DesignSystemSchema = z
  .object({
    theme: z.enum(["light", "dark", "auto"]).optional(),
    colors: z.record(z.string(), z.unknown()).optional(),
    typography: z.string().optional(),
    density: z.enum(["compact", "default", "relaxed"]).optional(),
  })
  .passthrough();

export const GenerateInputSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe("Product-level render brief for the UI artifact to generate."),
  dataInfo: z
    .string()
    .optional()
    .describe("JSON string containing data, a schema, or an explicit empty starting state."),
  data: z.unknown().optional().describe("Optional raw data payload for the initial render."),
  title: z.string().optional().describe("Optional artifact title."),
  designSystem: DesignSystemSchema.optional().describe("Optional theme and brand configuration."),
  backendType: z.enum(["fluxUI", "fluxAOT"]).optional().describe("Montage render backend."),
  interactive: z.boolean().optional().describe("Generate a mutable app instead of a read-only artifact."),
  hosted: z.boolean().optional().describe("Persist the artifact and return a hosted URL."),
  strictData: z.boolean().optional().describe("Fail closed when required data cannot be validated."),
  requiredFields: z.array(z.string()).optional().describe("Fields that must appear in the artifact."),
  requiredCapabilities: z
    .array(z.string())
    .optional()
    .describe("Runtime capabilities that must be available to the artifact."),
  cache: z
    .enum(["read-write", "read", "write", "skip", "read-through"])
    .optional()
    .describe("Cache behavior for generation."),
  zeroed: z.boolean().optional().describe("Start mutable collections empty instead of seeded."),
});

export const GetArtifactInputSchema = z.object({
  artifactId: z.string().min(1).describe("Artifact ID to retrieve."),
});

export const ListArtifactsInputSchema = z.object({
  limit: z.number().int().positive().max(200).optional().describe("Maximum artifacts to return."),
  offset: z.number().int().nonnegative().optional().describe("Pagination offset."),
});

export const GetVersionsInputSchema = z.object({
  artifactId: z.string().min(1).describe("Artifact ID whose versions should be listed."),
  limit: z.number().int().positive().max(200).optional().describe("Maximum versions to return."),
});

export const ListComponentsInputSchema = z.object({});

export const ConfigureAdapterInputSchema = z
  .object({
    provider: z.string().min(1).describe("Adapter provider, for example supabase or postgres."),
    apiKey: z.string().min(1).optional().describe("Convenience field for providers that need an API key."),
    config: z
      .record(z.string(), z.string())
      .optional()
      .describe("Provider-specific adapter configuration as string key/value pairs."),
  })
  .superRefine((input, ctx) => {
    if (!input.apiKey && (!input.config || Object.keys(input.config).length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Provide apiKey or at least one config entry.",
        path: ["config"],
      });
    }
  });

export const ListAdaptersInputSchema = z.object({});

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
export type GetArtifactInput = z.infer<typeof GetArtifactInputSchema>;
export type ListArtifactsInput = z.infer<typeof ListArtifactsInputSchema>;
export type GetVersionsInput = z.infer<typeof GetVersionsInputSchema>;
export type ConfigureAdapterInput = z.infer<typeof ConfigureAdapterInputSchema>;

