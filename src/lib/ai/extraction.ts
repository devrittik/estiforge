import { z } from "zod";

import { electricalCatalogue } from "@/modules/electrical/catalogue";

const catalogueCodes = electricalCatalogue.map((item) => item.code) as [
  (typeof electricalCatalogue)[number]["code"],
  ...(typeof electricalCatalogue)[number]["code"][],
];

const forbiddenKeys = new Set([
  "amount",
  "rate",
  "materialrate",
  "labourrate",
  "total",
  "subtotal",
  "tax",
  "price",
  "prices",
  "standard",
]);

export const extractionSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  supported: z.boolean(),
  unsupportedReason: z.string().trim().max(500).optional(),
  missing: z.array(z.string().trim().min(1).max(200)).max(20),
  explanation: z.string().trim().max(1000),
  lines: z
    .array(
      z.object({
        catalogueCode: z.enum(catalogueCodes),
        count: z.number().int().min(0).max(100_000).nullable().optional(),
        length: z.number().positive().max(100_000).nullable().optional(),
        terminationCount: z.number().int().min(0).max(10_000).nullable().optional(),
        extraPerTermination: z.number().min(0).max(100).nullable().optional(),
      }),
    )
    .max(50),
});

export type Extraction = z.infer<typeof extractionSchema>;

export type SuggestedLine = {
  catalogueCode: Extraction["lines"][number]["catalogueCode"];
  count: number | null;
  length: number | null;
  terminationCount: number | null;
  extraPerTermination: number | null;
};

export type RequirementSuggestion = {
  summary: string;
  supported: boolean;
  unsupportedReason: string;
  missing: string[];
  explanation: string;
  lines: SuggestedLine[];
};

export function parseModelJson(content: string):
  | { ok: true; suggestion: RequirementSuggestion }
  | { ok: false; message: string } {
  const json = stripFence(content);
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, message: "The model did not return JSON." };
  }
  if (containsForbidden(raw)) {
    return {
      ok: false,
      message: "The model tried to supply a price, total, or standard. Enter the quantities manually.",
    };
  }
  const parsed = extractionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((issue) => issue.message).join(" ") };
  }
  return { ok: true, suggestion: normalizeExtraction(parsed.data) };
}

function normalizeExtraction(extraction: Extraction): RequirementSuggestion {
  const missing = [...extraction.missing];
  const lines: SuggestedLine[] = [];
  for (const line of extraction.lines) {
    const item = electricalCatalogue.find((entry) => entry.code === line.catalogueCode);
    if (!item) {
      missing.push(`${line.catalogueCode} is not supported.`);
      continue;
    }
    if (item.unit === "nos" && (line.count === null || line.count === undefined)) {
      missing.push(`Count for ${item.name} was not stated.`);
      continue;
    }
    if (item.unit === "m" && (line.length === null || line.length === undefined)) {
      missing.push(`Measured length for ${item.name} was not stated.`);
      continue;
    }
    lines.push({
      catalogueCode: line.catalogueCode,
      count: item.unit === "nos" ? (line.count ?? null) : null,
      length: item.unit === "m" ? (line.length ?? null) : null,
      terminationCount: line.terminationCount ?? null,
      extraPerTermination: line.extraPerTermination ?? null,
    });
  }
  return {
    summary: extraction.summary,
    supported: extraction.supported,
    unsupportedReason: extraction.unsupportedReason ?? "",
    missing,
    explanation: extraction.explanation,
    lines,
  };
}

function stripFence(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function containsForbidden(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbidden(entry));
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(
      ([key, entry]) => forbiddenKeys.has(key.toLowerCase()) || containsForbidden(entry),
    );
  }
  return false;
}
