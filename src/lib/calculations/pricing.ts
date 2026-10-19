import { z } from "zod";

import {
  CalculationInputError,
  formatScaled,
  fromScaledInt,
  mulDivHalfAway,
  toScaledInt,
} from "@/lib/calculations/decimal";
import { CALCULATION_REFERENCE, type CalculationDefinition } from "@/lib/calculations/types";

const lineInputSchema = z.object({
  quantity: z.number().min(0),
  unit: z.enum(["nos", "m"]),
  materialRate: z.number().min(0),
  labourRate: z.number().min(0),
});

const totalInputSchema = z.object({
  lineAmounts: z.array(z.number().min(0)).max(500),
  adjustment: z.number(),
  taxPercent: z.number().min(0).max(100),
});

export const boqPriceDefinition: CalculationDefinition = {
  id: "electrical.boq-price",
  version: "1.0.0",
  name: "BOQ line price",
  description: "Prices one quantity at the sum of its material and labour rates.",
  discipline: "electrical",
  category: "pricing",
  formula: "rate = materialRate + labourRate; amount = round(quantity × rate) to 0.01",
  units: ["nos", "m"],
  assumptions: [
    "Material and labour rates come from the user's rate book.",
    "The rate unit matches the quantity unit.",
    "Currency amounts use two decimal places and round half away from zero.",
  ],
  limitations: [
    "Rates are not looked up from a market feed.",
    "Tax is applied to the quotation total, not to each line.",
  ],
  reference: CALCULATION_REFERENCE,
};

export const quotationTotalDefinition: CalculationDefinition = {
  id: "shared.quotation-total",
  version: "1.0.0",
  name: "Quotation total",
  description: "Sums line amounts, applies a fixed adjustment, then a tax percentage.",
  discipline: "shared",
  category: "pricing",
  formula: "taxable = subtotal + adjustment; tax = round(taxable × taxPercent / 100); total = taxable + tax",
  units: [],
  assumptions: [
    "Adjustment is a fixed currency amount. A negative adjustment is a discount.",
    "Tax is a single percentage of the amount after adjustment.",
    "Line amounts are already rounded to currency minor units.",
  ],
  limitations: [
    "This is not a tax-jurisdiction engine. The percentage is whatever the user configured.",
    "The taxable amount cannot be negative.",
  ],
  reference: CALCULATION_REFERENCE,
};

export function priceBoqLine(input: unknown): {
  rate: number;
  amount: number;
  trace: string[];
} {
  const parsed = lineInputSchema.parse(input);
  const material = toScaledInt(parsed.materialRate, 2, "Material rate");
  const labour = toScaledInt(parsed.labourRate, 2, "Labour rate");
  const rate = material + labour;
  if (!Number.isSafeInteger(rate)) {
    throw new CalculationInputError("Combined rate is too large.");
  }

  const amountMinor =
    parsed.unit === "nos"
      ? priceCount(parsed.quantity, rate)
      : priceLength(parsed.quantity, rate);

  return {
    rate: fromScaledInt(rate, 2),
    amount: fromScaledInt(amountMinor, 2),
    trace: [
      `rate ${formatScaled(material, 2)} + ${formatScaled(labour, 2)} = ${formatScaled(rate, 2)} per ${parsed.unit}`,
      `amount ${formatScaled(amountMinor, 2)}`,
    ],
  };
}

export function quoteTotal(input: unknown): {
  subtotal: number;
  adjustment: number;
  taxable: number;
  tax: number;
  total: number;
  trace: string[];
} {
  const parsed = totalInputSchema.parse(input);
  const lineMinors = parsed.lineAmounts.map((amount) => toScaledInt(amount, 2, "Line amount"));
  const subtotal = lineMinors.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(subtotal)) {
    throw new CalculationInputError("Subtotal is too large.");
  }
  const adjustment = toScaledInt(parsed.adjustment, 2, "Adjustment", true);
  const taxable = subtotal + adjustment;
  if (taxable < 0) {
    throw new CalculationInputError("Taxable amount cannot be negative.");
  }
  const taxBasisPoints = toScaledInt(parsed.taxPercent, 2, "Tax percent");
  const tax = mulDivHalfAway(taxable, taxBasisPoints, 10_000);
  const total = taxable + tax;
  if (!Number.isSafeInteger(total)) {
    throw new CalculationInputError("Total is too large.");
  }
  return {
    subtotal: fromScaledInt(subtotal, 2),
    adjustment: fromScaledInt(adjustment, 2),
    taxable: fromScaledInt(taxable, 2),
    tax: fromScaledInt(tax, 2),
    total: fromScaledInt(total, 2),
    trace: [
      `subtotal ${formatScaled(subtotal, 2)}`,
      `adjustment ${formatScaled(adjustment, 2)}`,
      `tax ${formatScaled(taxBasisPoints, 2)}% = ${formatScaled(tax, 2)}`,
      `total ${formatScaled(total, 2)}`,
    ],
  };
}

function priceCount(quantity: number, rateMinor: number): number {
  if (!Number.isInteger(quantity)) {
    throw new CalculationInputError("Item quantities must be whole numbers.");
  }
  const amount = quantity * rateMinor;
  if (!Number.isSafeInteger(amount)) {
    throw new CalculationInputError("Line amount is too large.");
  }
  return amount;
}

function priceLength(quantity: number, rateMinor: number): number {
  const millimetres = toScaledInt(quantity, 3, "Length quantity");
  return mulDivHalfAway(millimetres, rateMinor, 1_000);
}
