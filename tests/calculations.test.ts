import { describe, expect, it } from "vitest";

import { buildElectricalBoq } from "@/lib/calculations/boq";
import { toScaledInt } from "@/lib/calculations/decimal";
import { parseRateItemCsv, rateItemsToCsv } from "@/lib/calculations/rate-csv";
import { runCalculation } from "@/lib/calculations/registry";

const lightRate = {
  name: "LED point",
  unit: "nos" as const,
  materialRate: 0.1,
  labourRate: 0.2,
  wastagePercent: 0,
};

describe("electrical calculations", () => {
  it("prices point counts from explicit rates without float drift", () => {
    const result = buildElectricalBoq({
      lines: [{ catalogueCode: "light-point", count: 12, rate: lightRate }],
      adjustment: 0,
      taxPercent: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.boq.lines[0]).toMatchObject({ quantity: 12, rate: 0.3, amount: 3.6 });
    expect(result.boq.subtotal).toBe(3.6);
    expect(result.boq.lines[0]?.methodId).toBe("electrical.point-quantity");
    expect(result.boq.lines[0]?.methodVersion).toBe("1.0.0");
  });

  it("rounds point wastage half away from zero", () => {
    const result = runCalculation("electrical.point-quantity", { count: 10, wastagePercent: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.quantity).toBe(11);
      expect(result.trace.join(" ")).toContain("adds 1 nos");
    }
  });

  it("sums cable routes, then wastage, then terminations", () => {
    const result = buildElectricalBoq({
      lines: [
        {
          catalogueCode: "cable",
          segments: [{ length: 10 }, { length: 4.5 }],
          terminationCount: 2,
          extraPerTermination: 0.3,
          rate: {
            name: "1.5 mm² cable",
            unit: "m",
            materialRate: 100,
            labourRate: 50,
            wastagePercent: 10,
          },
        },
      ],
      adjustment: -100,
      taxPercent: 18,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const line = result.boq.lines[0];
    expect(line?.quantity).toBe(16.55);
    expect(line?.amount).toBe(2482.5);
    expect(line?.trace.join(" | ")).toContain("measured 14.500 m");
    expect(result.boq.subtotal).toBe(2482.5);
    expect(result.boq.taxable).toBe(2382.5);
    expect(result.boq.tax).toBe(428.85);
    expect(result.boq.total).toBe(2811.35);
  });

  it("rejects a rate whose unit does not match the catalogue item", () => {
    const result = buildElectricalBoq({
      lines: [
        {
          catalogueCode: "socket",
          count: 4,
          rate: { ...lightRate, unit: "m", name: "Cable rate" },
        },
      ],
      adjustment: 0,
      taxPercent: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("nos");
    }
  });

  it("reports unsupported calculations instead of inventing a result", () => {
    const result = runCalculation("civil.slab-volume", { length: 4, width: 3, depth: 0.15 });
    expect(result).toMatchObject({
      ok: false,
      supported: false,
      calculationId: "civil.slab-volume",
    });
  });

  it("rejects money that is not limited to two decimal places", () => {
    expect(() => toScaledInt(1.005, 2, "Material rate")).toThrow(/2 decimal places/);
  });

  it("rounds a half-minor tax up", () => {
    const result = runCalculation("shared.quotation-total", {
      lineAmounts: [0.03],
      adjustment: 0,
      taxPercent: 18,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.tax).toBe(0.01);
      expect(result.output.total).toBe(0.04);
    }
  });

  it("round-trips rate book CSV, including commas in names", () => {
    const csv = rateItemsToCsv([
      {
        name: "Light, LED",
        unit: "nos",
        materialRate: 80,
        labourRate: 40,
        wastagePercent: 0,
        discipline: "electrical",
        catalogueCode: "light-point",
      },
    ]);
    const parsed = parseRateItemCsv(csv);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.items[0]?.name).toBe("Light, LED");
    }
  });
});
