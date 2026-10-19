import { ZodError } from "zod";

import { CalculationInputError } from "@/lib/calculations/decimal";
import type { CalculationDefinition, CalculationResult } from "@/lib/calculations/types";
import {
  boqPriceDefinition,
  priceBoqLine,
  quotationTotalDefinition,
  quoteTotal,
} from "@/lib/calculations/pricing";
import {
  calculatePointQuantity,
  calculateRouteLength,
  pointQuantityDefinition,
  routeLengthDefinition,
} from "@/modules/electrical/methods";

type Handler = (input: unknown) => { output: Record<string, unknown>; trace: string[] };

const handlers = new Map<string, { definition: CalculationDefinition; run: Handler }>();

register(pointQuantityDefinition, (input) => {
  const result = calculatePointQuantity(input);
  return { output: { quantity: result.quantity, unit: result.unit }, trace: result.trace };
});

register(routeLengthDefinition, (input) => {
  const result = calculateRouteLength(input);
  return {
    output: {
      quantity: result.quantity,
      unit: result.unit,
      baseLength: result.baseLength,
      wastageLength: result.wastageLength,
      terminationAllowance: result.terminationAllowance,
    },
    trace: result.trace,
  };
});

register(boqPriceDefinition, (input) => {
  const result = priceBoqLine(input);
  return { output: { rate: result.rate, amount: result.amount }, trace: result.trace };
});

register(quotationTotalDefinition, (input) => {
  const result = quoteTotal(input);
  const { trace, ...output } = result;
  return { output, trace };
});

function register(definition: CalculationDefinition, run: Handler) {
  handlers.set(definition.id, { definition, run });
}

export function listCalculations(): CalculationDefinition[] {
  return [...handlers.values()].map((entry) => entry.definition);
}

export function getCalculation(id: string): CalculationDefinition | null {
  return handlers.get(id)?.definition ?? null;
}

export function runCalculation(id: string, input: unknown): CalculationResult {
  const entry = handlers.get(id);
  if (!entry) {
    return {
      ok: false,
      supported: false,
      calculationId: id,
      message: `${id} is not a supported calculation. EstiForge will not estimate it.`,
    };
  }

  try {
    const result = entry.run(input);
    return {
      ok: true,
      supported: true,
      calculationId: entry.definition.id,
      version: entry.definition.version,
      output: result.output,
      trace: result.trace,
      assumptions: entry.definition.assumptions,
      limitations: entry.definition.limitations,
      reference: entry.definition.reference,
    };
  } catch (error) {
    return {
      ok: false,
      supported: true,
      calculationId: entry.definition.id,
      message: messageFrom(error),
    };
  }
}

function messageFrom(error: unknown): string {
  if (error instanceof CalculationInputError) {
    return error.message;
  }
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Calculation input is invalid.";
  }
  return "Calculation input is invalid.";
}
