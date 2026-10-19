import { z } from "zod";

import { electricalCatalogue } from "@/modules/electrical/catalogue";

const catalogueCodes = electricalCatalogue.map((item) => item.code) as [
  (typeof electricalCatalogue)[number]["code"],
  ...(typeof electricalCatalogue)[number]["code"][],
];

export const passwordSchema = z
  .string()
  .min(8, { error: "Use at least 8 characters." })
  .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
  .regex(/[0-9]/, { error: "Include at least one number." })
  .regex(/[^a-zA-Z0-9]/, { error: "Include at least one symbol." });

export const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name." }).max(120),
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: passwordSchema,
  preferredDiscipline: z.enum(["electrical", "civil"]),
});

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z.string().min(1, { error: "Enter your password." }),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, { error: "Enter a project name." }).max(120),
  clientName: z.string().trim().min(1, { error: "Enter the client name." }).max(120),
  clientEmail: z.union([z.literal(""), z.email({ error: "Enter a valid client email." })]),
  clientPhone: z.string().trim().max(40),
  location: z.string().trim().min(1, { error: "Enter the project location." }).max(200),
  discipline: z.enum(["electrical", "civil"]),
  description: z.string().trim().max(4000),
});

export const estimateDraftSchema = z.object({
  projectId: z.string().regex(/^[a-f0-9]{24}$/i, { error: "Choose a project." }),
  title: z.string().trim().min(1, { error: "Enter an estimate title." }).max(160),
  description: z.string().trim().max(4000),
});

export const rateItemSchema = z.object({
  name: z.string().trim().min(1, { error: "Enter an item name." }).max(160),
  unit: z.enum(["nos", "m"], { error: "Choose nos or m." }),
  materialRate: z.number().min(0, { error: "Material rate cannot be negative." }).max(1_000_000),
  labourRate: z.number().min(0, { error: "Labour rate cannot be negative." }).max(1_000_000),
  wastagePercent: z.number().min(0).max(100),
  discipline: z.enum(["electrical", "civil"]),
  catalogueCode: z.union([z.literal(""), z.enum(catalogueCodes)]),
});

export const calculateEstimateSchema = z.object({
  lines: z
    .array(
      z.object({
        catalogueCode: z.enum(catalogueCodes),
        count: z.number().optional(),
        segments: z.array(z.object({ length: z.number() })).optional(),
        terminationCount: z.number().optional(),
        extraPerTermination: z.number().optional(),
        rateItemId: z.string().regex(/^[a-f0-9]{24}$/i, { error: "Choose a rate item." }),
        materialRate: z.number().min(0).max(1_000_000).optional(),
        labourRate: z.number().min(0).max(1_000_000).optional(),
        wastagePercent: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1)
    .max(200),
  adjustment: z.number(),
  taxPercent: z.number().min(0).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type EstimateDraftInput = z.infer<typeof estimateDraftSchema>;
export type RateItemInput = z.infer<typeof rateItemSchema>;
export type CalculateEstimateInput = z.infer<typeof calculateEstimateSchema>;

export const quotationDraftSchema = z.object({
  estimateId: z.string().regex(/^[a-f0-9]{24}$/i, { error: "Choose an estimate." }),
  number: z.string().trim().min(1, { error: "Enter a quotation number." }).max(40),
  businessName: z.string().trim().min(1, { error: "Enter the business name." }).max(160),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." }),
  adjustment: z.number(),
  taxPercent: z.number().min(0).max(100),
  exclusions: z.string().trim().max(4000),
  terms: z.string().trim().max(4000),
  validity: z.string().trim().max(200),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, { error: "Enter a line description." }).max(300),
        unit: z.enum(["nos", "m"]),
        quantity: z.number().min(0),
        rate: z.number().min(0),
      }),
    )
    .min(1)
    .max(200),
});

export type QuotationDraftInput = z.infer<typeof quotationDraftSchema>;

export const estimateStatusSchema = z.object({
  status: z.enum(["draft", "completed"]),
});

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= [];
    fields[key].push(issue.message);
  }
  return fields;
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}
