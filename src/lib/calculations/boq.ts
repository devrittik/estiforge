import { z } from "zod";

import { runCalculation } from "@/lib/calculations/registry";
import { findCatalogueItem, type CatalogueCode } from "@/modules/electrical/catalogue";

const rateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  unit: z.enum(["nos", "m"]),
  materialRate: z.number().min(0),
  labourRate: z.number().min(0),
  wastagePercent: z.number().min(0).max(100),
});

const pointLineSchema = z.object({
  catalogueCode: z.enum(["light-point", "fan-point", "switch", "socket", "distribution-board"]),
  count: z.number(),
  rate: rateSchema,
});

const routeLineSchema = z.object({
  catalogueCode: z.enum(["cable", "conduit"]),
  segments: z.array(z.object({ length: z.number() })).min(1),
  terminationCount: z.number(),
  extraPerTermination: z.number(),
  rate: rateSchema,
});

const boqSchema = z.object({
  lines: z.array(z.union([routeLineSchema, pointLineSchema])).min(1).max(200),
  adjustment: z.number(),
  taxPercent: z.number(),
});

export type ElectricalBoqInput = z.infer<typeof boqSchema>;

export type PricedLine = {
  catalogueCode: CatalogueCode;
  description: string;
  methodId: string;
  methodVersion: string;
  unit: "nos" | "m";
  quantity: number;
  materialRate: number;
  labourRate: number;
  rate: number;
  wastagePercent: number;
  amount: number;
  trace: string[];
  assumptions: string[];
  limitations: string[];
};

export type PricedBoq = {
  lines: PricedLine[];
  subtotal: number;
  adjustment: number;
  taxPercent: number;
  taxable: number;
  tax: number;
  total: number;
  trace: string[];
  methodIds: string[];
};

export function buildElectricalBoq(input: unknown):
  | { ok: true; boq: PricedBoq }
  | { ok: false; message: string } {
  const parsed = boqSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Estimate input is invalid." };
  }

  const lines: PricedLine[] = [];
  for (const line of parsed.data.lines) {
    const priced = priceLine(line);
    if (!priced.ok) {
      return priced;
    }
    lines.push(priced.line);
  }

  const total = runCalculation("shared.quotation-total", {
    lineAmounts: lines.map((line) => line.amount),
    adjustment: parsed.data.adjustment,
    taxPercent: parsed.data.taxPercent,
  });
  if (!total.ok) {
    return { ok: false, message: total.message };
  }

  const output = total.output as {
    subtotal: number;
    adjustment: number;
    taxable: number;
    tax: number;
    total: number;
  };

  return {
    ok: true,
    boq: {
      lines,
      subtotal: output.subtotal,
      adjustment: output.adjustment,
      taxPercent: parsed.data.taxPercent,
      taxable: output.taxable,
      tax: output.tax,
      total: output.total,
      trace: total.trace,
      methodIds: [...new Set([...lines.map((line) => line.methodId), "electrical.boq-price", total.calculationId])],
    },
  };
}

function priceLine(
  line: ElectricalBoqInput["lines"][number],
): { ok: true; line: PricedLine } | { ok: false; message: string } {
  const item = findCatalogueItem(line.catalogueCode);
  if (!item) {
    return {
      ok: false,
      message: `${line.catalogueCode} is not a supported electrical catalogue item.`,
    };
  }
  if (line.rate.unit !== item.unit) {
    return {
      ok: false,
      message: `${item.name} is priced per ${item.unit}, but the rate unit is ${line.rate.unit}.`,
    };
  }

  const quantityInput =
    item.methodId === "electrical.point-quantity"
      ? { count: "count" in line ? line.count : 0, wastagePercent: line.rate.wastagePercent }
      : {
          kind: line.catalogueCode,
          segments: "segments" in line ? line.segments : [],
          wastagePercent: line.rate.wastagePercent,
          terminationCount: "terminationCount" in line ? line.terminationCount : 0,
          extraPerTermination: "extraPerTermination" in line ? line.extraPerTermination : 0,
        };

  const quantity = runCalculation(item.methodId, quantityInput);
  if (!quantity.ok) {
    return { ok: false, message: quantity.message };
  }

  const priced = runCalculation("electrical.boq-price", {
    quantity: quantity.output.quantity,
    unit: item.unit,
    materialRate: line.rate.materialRate,
    labourRate: line.rate.labourRate,
  });
  if (!priced.ok) {
    return { ok: false, message: priced.message };
  }

  return {
    ok: true,
    line: {
      catalogueCode: item.code,
      description: `${item.name} (${line.rate.name})`,
      methodId: quantity.calculationId,
      methodVersion: quantity.version,
      unit: item.unit,
      quantity: quantity.output.quantity as number,
      materialRate: line.rate.materialRate,
      labourRate: line.rate.labourRate,
      rate: priced.output.rate as number,
      wastagePercent: line.rate.wastagePercent,
      amount: priced.output.amount as number,
      trace: [...quantity.trace, ...priced.trace],
      assumptions: quantity.assumptions,
      limitations: quantity.limitations,
    },
  };
}
