import { ZodError } from "zod";

import { CalculationInputError } from "@/lib/calculations/decimal";
import { priceBoqLine, quoteTotal } from "@/lib/calculations/pricing";

export type QuotationLine = {
  description: string;
  unit: "nos" | "m";
  quantity: number;
  rate: number;
  amount: number;
};

export type QuotationDocument = {
  number: string;
  businessName: string;
  clientName: string;
  projectName: string;
  location: string;
  issuedOn: string;
  items: QuotationLine[];
  subtotal: number;
  adjustment: number;
  taxPercent: number;
  taxable: number;
  tax: number;
  total: number;
  exclusions: string;
  terms: string;
  validity: string;
};

export type QuotationDraft = Omit<QuotationDocument, "items" | "subtotal" | "taxable" | "tax" | "total"> & {
  items: Array<Omit<QuotationLine, "amount">>;
};

export function repriceQuotation(draft: QuotationDraft):
  | { ok: true; document: QuotationDocument }
  | { ok: false; message: string } {
  try {
    const items = draft.items.map((item) => {
      const priced = priceBoqLine({
        quantity: item.quantity,
        unit: item.unit,
        materialRate: item.rate,
        labourRate: 0,
      });
      return { ...item, amount: priced.amount, rate: priced.rate };
    });
    const totals = quoteTotal({
      lineAmounts: items.map((item) => item.amount),
      adjustment: draft.adjustment,
      taxPercent: draft.taxPercent,
    });
    return {
      ok: true,
      document: {
        ...draft,
        items,
        subtotal: totals.subtotal,
        taxable: totals.taxable,
        tax: totals.tax,
        total: totals.total,
      },
    };
  } catch (error) {
    const message =
      error instanceof CalculationInputError
        ? error.message
        : error instanceof ZodError
          ? (error.issues[0]?.message ?? "Quotation lines are invalid.")
          : "Quotation lines are invalid.";
    return { ok: false, message };
  }
}

export function quotationToCsv(document: QuotationDocument): string {
  const rows = [
    ["quotation", document.number],
    ["business", document.businessName],
    ["client", document.clientName],
    ["project", document.projectName],
    ["location", document.location],
    ["issued", document.issuedOn],
    [],
    ["description", "unit", "quantity", "rate", "amount"],
    ...document.items.map((item) => [
      item.description,
      item.unit,
      item.quantity.toFixed(item.unit === "m" ? 3 : 0),
      item.rate.toFixed(2),
      item.amount.toFixed(2),
    ]),
    [],
    ["subtotal", document.subtotal.toFixed(2)],
    ["adjustment", document.adjustment.toFixed(2)],
    ["taxPercent", document.taxPercent.toFixed(2)],
    ["tax", document.tax.toFixed(2)],
    ["total", document.total.toFixed(2)],
    ["exclusions", document.exclusions],
    ["terms", document.terms],
    ["validity", document.validity],
  ];
  return rows.map((row) => row.map((cell) => csvCell(String(cell ?? ""))).join(",")).join("\n");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
