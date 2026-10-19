import "server-only";

import { Types } from "mongoose";

import { buildElectricalBoq, type ElectricalBoqInput } from "@/lib/calculations/boq";
import { connectToDatabase } from "@/lib/db/mongo";
import { EstimateModel } from "@/lib/db/models";
import { getOwnedRateItems } from "@/lib/db/rate-items";
import type { CalculateEstimateInput } from "@/lib/validation/schemas";
import { findCatalogueItem } from "@/modules/electrical/catalogue";

export class EstimateCalculationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "EstimateCalculationError";
  }
}

export async function calculateOwnedEstimate(ownerId: string, estimateId: string, input: CalculateEstimateInput) {
  if (!Types.ObjectId.isValid(estimateId)) {
    throw new EstimateCalculationError("Estimate not found.", 404);
  }
  await connectToDatabase();
  const estimate = await EstimateModel.findOne({ _id: estimateId, ownerId });
  if (!estimate) {
    throw new EstimateCalculationError("Estimate not found.", 404);
  }
  if (estimate.discipline !== "electrical") {
    throw new EstimateCalculationError(
      "Civil calculations are not supported. EstiForge will not estimate them.",
      422,
    );
  }

  const rates = await getOwnedRateItems(
    ownerId,
    input.lines.map((line) => line.rateItemId),
  );
  const lines: ElectricalBoqInput["lines"] = [];
  for (const line of input.lines) {
    const rate = rates.get(line.rateItemId);
    const item = findCatalogueItem(line.catalogueCode);
    if (!rate || !item) {
      throw new EstimateCalculationError("Choose a rate item you own.", 404);
    }
    if (rate.discipline !== "electrical" || rate.unit !== item.unit) {
      throw new EstimateCalculationError(
        `${item.name} needs an electrical rate in ${item.unit}.`,
        400,
      );
    }
    const rateSnapshot = {
      name: rate.name,
      unit: rate.unit,
      materialRate: line.materialRate ?? rate.materialRate,
      labourRate: line.labourRate ?? rate.labourRate,
      wastagePercent: line.wastagePercent ?? rate.wastagePercent,
    };
    if (item.methodId === "electrical.route-length") {
      lines.push({
        catalogueCode: line.catalogueCode as "cable" | "conduit",
        segments: line.segments ?? [],
        terminationCount: line.terminationCount ?? 0,
        extraPerTermination: line.extraPerTermination ?? 0,
        rate: rateSnapshot,
      });
    } else {
      lines.push({
        catalogueCode: line.catalogueCode as
          | "light-point"
          | "fan-point"
          | "switch"
          | "socket"
          | "distribution-board",
        count: line.count ?? Number.NaN,
        rate: rateSnapshot,
      });
    }
  }

  const priced = buildElectricalBoq({
    lines,
    adjustment: input.adjustment,
    taxPercent: input.taxPercent,
  });
  if (!priced.ok) {
    throw new EstimateCalculationError(priced.message, 400);
  }

  const previous = estimate.calculationOutputs.at(-1);
  const version = (previous?.version ?? 0) + 1;
  estimate.calculationOutputs.push({
    version,
    methodIds: priced.boq.methodIds,
    results: priced.boq,
    createdAt: new Date(),
  });
  estimate.inputs = input;
  estimate.markModified("inputs");
  estimate.markModified("calculationOutputs");
  await estimate.save();

  return { version, boq: priced.boq };
}
