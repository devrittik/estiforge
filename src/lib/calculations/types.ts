export const CALCULATION_REFERENCE =
  "EstiForge electrical quantity method 1.0.0. Counts and route lengths are user-entered. This is not a cable-sizing, protection, earthing, or load-certification method.";

export type CalculationDefinition = {
  id: string;
  version: string;
  name: string;
  description: string;
  discipline: "electrical" | "shared";
  category: "quantity" | "pricing";
  formula: string;
  units: string[];
  assumptions: string[];
  limitations: string[];
  reference: string;
};

export type CalculationSuccess = {
  ok: true;
  supported: true;
  calculationId: string;
  version: string;
  output: Record<string, unknown>;
  trace: string[];
  assumptions: string[];
  limitations: string[];
  reference: string;
};

export type CalculationFailure = {
  ok: false;
  supported: boolean;
  calculationId: string;
  message: string;
};

export type CalculationResult = CalculationSuccess | CalculationFailure;
