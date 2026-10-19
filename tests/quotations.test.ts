import { describe, expect, it } from "vitest";

import { quotationToCsv, repriceQuotation } from "@/lib/quotations/document";
import { renderQuotationPdf } from "@/lib/quotations/pdf";

const draft = {
  number: "Q-1001",
  businessName: "Ada Electrical",
  clientName: "North Depot",
  projectName: "Site lighting",
  location: "Pune",
  issuedOn: "2026-10-18",
  adjustment: 0,
  taxPercent: 18,
  exclusions: "Cable sizing is excluded",
  terms: "Payment on completion",
  validity: "15 days",
  items: [{ description: "Light point (LED)", unit: "nos" as const, quantity: 12, rate: 120 }],
};

describe("quotation documents", () => {
  it("recalculates line amounts and tax instead of trusting a submitted total", () => {
    const priced = repriceQuotation(draft);
    expect(priced.ok).toBe(true);
    if (!priced.ok) {
      return;
    }
    expect(priced.document.items[0]?.amount).toBe(1440);
    expect(priced.document.tax).toBe(259.2);
    expect(priced.document.total).toBe(1699.2);
  });

  it("rejects a quantity that is not a whole number of items", () => {
    const priced = repriceQuotation({
      ...draft,
      items: [{ ...draft.items[0], quantity: 1.5 }],
    });
    expect(priced.ok).toBe(false);
  });

  it("writes the snapshot amounts into CSV", () => {
    const priced = repriceQuotation(draft);
    expect(priced.ok).toBe(true);
    if (!priced.ok) {
      return;
    }
    const csv = quotationToCsv(priced.document);
    expect(csv).toContain("Light point (LED),nos,12,120.00,1440.00");
    expect(csv).toContain("total,1699.20");
    expect(csv).toContain("Cable sizing is excluded");
  });

  it("renders a PDF from the snapshot", async () => {
    const priced = repriceQuotation(draft);
    expect(priced.ok).toBe(true);
    if (!priced.ok) {
      return;
    }
    const pdf = await renderQuotationPdf(priced.document);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });
});
