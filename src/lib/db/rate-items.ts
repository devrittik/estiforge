import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongo";
import { RateItemModel } from "@/lib/db/models";
import type { RateItemInput } from "@/lib/validation/schemas";
import { findCatalogueItem } from "@/modules/electrical/catalogue";

export type RateItemRecord = RateItemInput & {
  id: string;
  updatedAt: string;
};

function asCatalogueCode(value: string | undefined): RateItemInput["catalogueCode"] {
  if (value && findCatalogueItem(value)) {
    return value as RateItemInput["catalogueCode"];
  }
  return "";
}

function isObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value) && Types.ObjectId.isValid(value);
}

function toRateItem(doc: {
  _id: { toString(): string };
  name: string;
  unit: "nos" | "m";
  materialRate: number;
  labourRate: number;
  wastagePercent: number;
  discipline: "electrical" | "civil";
  catalogueCode?: string;
  updatedAt?: Date;
}): RateItemRecord {
  return {
    id: doc._id.toString(),
    name: doc.name,
    unit: doc.unit,
    materialRate: doc.materialRate,
    labourRate: doc.labourRate,
    wastagePercent: doc.wastagePercent,
    discipline: doc.discipline,
    catalogueCode: asCatalogueCode(doc.catalogueCode),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

export async function listRateItems(
  ownerId: string,
  query?: { q?: string; discipline?: string },
): Promise<RateItemRecord[]> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { ownerId };
  if (query?.discipline === "electrical" || query?.discipline === "civil") {
    filter.discipline = query.discipline;
  }
  const term = query?.q?.trim();
  if (term) {
    filter.name = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  const items = await RateItemModel.find(filter).sort({ name: 1 }).limit(200).lean();
  return items.map((item) => toRateItem(item));
}

export async function createRateItem(ownerId: string, input: RateItemInput): Promise<RateItemRecord> {
  await connectToDatabase();
  const item = await RateItemModel.create({ ...input, ownerId });
  return toRateItem(item);
}

export async function createRateItems(
  ownerId: string,
  inputs: RateItemInput[],
): Promise<RateItemRecord[]> {
  await connectToDatabase();
  const items = await RateItemModel.insertMany(inputs.map((input) => ({ ...input, ownerId })));
  return items.map((item) => toRateItem(item));
}

export async function updateOwnedRateItem(
  ownerId: string,
  rateItemId: string,
  input: RateItemInput,
): Promise<RateItemRecord | null> {
  if (!isObjectId(rateItemId)) {
    return null;
  }
  await connectToDatabase();
  const item = await RateItemModel.findOneAndUpdate(
    { _id: rateItemId, ownerId },
    input,
    { returnDocument: "after" },
  ).lean();
  return item ? toRateItem(item) : null;
}

export async function getOwnedRateItems(
  ownerId: string,
  ids: string[],
): Promise<Map<string, RateItemRecord>> {
  await connectToDatabase();
  const valid = ids.filter((id) => isObjectId(id));
  const items = await RateItemModel.find({ _id: { $in: valid }, ownerId }).lean();
  return new Map(items.map((item) => [String(item._id), toRateItem(item)]));
}
