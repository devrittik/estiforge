import { z } from "zod";

import { CalculationInputError, formatScaled, fromScaledInt, mulDivHalfAway, toScaledInt } from "@/lib/calculations/decimal";
import { CALCULATION_REFERENCE, type CalculationDefinition } from "@/lib/calculations/types";

const pointInputSchema = z.object({
  count: z.number().int().min(0).max(100_000),
  wastagePercent: z.number().min(0).max(100),
});

const routeInputSchema = z.object({
  kind: z.enum(["cable", "conduit"]),
  segments: z.array(z.object({ length: z.number().positive().max(100_000) })).min(1).max(200),
  wastagePercent: z.number().min(0).max(100),
  terminationCount: z.number().int().min(0).max(10_000),
  extraPerTermination: z.number().min(0).max(100),
});

export const pointQuantityDefinition: CalculationDefinition = {
  id: "electrical.point-quantity",
  version: "1.0.0",
  name: "Point quantity",
  description: "Converts a counted light, fan, switch, socket, or distribution-board point into a billable quantity.",
  discipline: "electrical",
  category: "quantity",
  formula: "quantity = round(count × (1 + wastagePercent / 100)) to a whole number",
  units: ["nos"],
  assumptions: [
    "One entered point becomes one catalogue item before wastage.",
    "Wastage is an explicit percentage and is rounded half away from zero to a whole item.",
  ],
  limitations: [
    "This does not calculate electrical load, circuit count, diversity, or protection.",
    "Counts must be entered by the user. Missing counts are not assumed.",
  ],
  reference: CALCULATION_REFERENCE,
};

export const routeLengthDefinition: CalculationDefinition = {
  id: "electrical.route-length",
  version: "1.0.0",
  name: "Route length",
  description: "Sums measured cable or conduit segments, applies wastage to that length, then adds termination allowance.",
  discipline: "electrical",
  category: "quantity",
  formula:
    "quantity = sum(segments) × (1 + wastagePercent / 100) + terminationCount × extraPerTermination",
  units: ["m"],
  assumptions: [
    "Segment lengths are measured on site or taken from a drawing and entered in metres.",
    "Wastage applies only to the measured length. Termination allowance is added afterwards and is not wasted again.",
    "Lengths are calculated in millimetres and rounded half away from zero.",
  ],
  limitations: [
    "This does not size conductors, check voltage drop, or select conduit fill.",
    "Vertical drops, loops, and bends must be included in the entered segments or termination allowance.",
  ],
  reference: CALCULATION_REFERENCE,
};

export function calculatePointQuantity(input: unknown): {
  quantity: number;
  unit: "nos";
  trace: string[];
} {
  const parsed = pointInputSchema.parse(input);
  const count = parsed.count;
  const wastage = toScaledInt(parsed.wastagePercent, 2, "Wastage");
  const extra = mulDivHalfAway(count, wastage, 10_000);
  const quantity = count + extra;
  return {
    quantity,
    unit: "nos",
    trace: [
      `count ${count} nos`,
      `wastage ${formatScaled(wastage, 2)}% adds ${extra} nos`,
      `quantity ${quantity} nos`,
    ],
  };
}

export function calculateRouteLength(input: unknown): {
  quantity: number;
  unit: "m";
  baseLength: number;
  wastageLength: number;
  terminationAllowance: number;
  trace: string[];
} {
  const parsed = routeInputSchema.parse(input);
  const segmentMm = parsed.segments.map((segment) => toScaledInt(segment.length, 3, "Segment length"));
  const baseMm = segmentMm.reduce((sum, length) => sum + length, 0);
  if (!Number.isSafeInteger(baseMm)) {
    throw new CalculationInputError("Measured length is too large.");
  }
  const wastage = toScaledInt(parsed.wastagePercent, 2, "Wastage");
  const wastageMm = mulDivHalfAway(baseMm, wastage, 10_000);
  const extraMm = toScaledInt(parsed.extraPerTermination, 3, "Termination allowance");
  const terminationMm = parsed.terminationCount * extraMm;
  if (!Number.isSafeInteger(terminationMm)) {
    throw new CalculationInputError("Termination allowance is too large.");
  }
  const quantityMm = baseMm + wastageMm + terminationMm;
  return {
    quantity: fromScaledInt(quantityMm, 3),
    unit: "m",
    baseLength: fromScaledInt(baseMm, 3),
    wastageLength: fromScaledInt(wastageMm, 3),
    terminationAllowance: fromScaledInt(terminationMm, 3),
    trace: [
      `${parsed.kind} measured ${formatScaled(baseMm, 3)} m`,
      `wastage ${formatScaled(wastage, 2)}% adds ${formatScaled(wastageMm, 3)} m`,
      `terminations ${parsed.terminationCount} × ${formatScaled(extraMm, 3)} m = ${formatScaled(terminationMm, 3)} m`,
      `quantity ${formatScaled(quantityMm, 3)} m`,
    ],
  };
}
