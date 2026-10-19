import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongo";
import { EstimateModel, ProjectModel, QuotationModel } from "@/lib/db/models";
import type { PricedBoq } from "@/lib/calculations/boq";
import type { CalculateEstimateInput, EstimateDraftInput, ProjectInput } from "@/lib/validation/schemas";
import { calculateEstimateSchema } from "@/lib/validation/schemas";

export type ProjectRecord = ProjectInput & {
  id: string;
  updatedAt: string;
};

export type EstimateRecord = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: "draft" | "completed";
  discipline: "electrical" | "civil";
  calculationVersion: number | null;
  updatedAt: string;
};

export type QuotationSummary = {
  id: string;
  number: string;
  projectId: string;
  updatedAt: string;
};

export type QuotationSnapshot = {
  businessName: string;
  clientName: string;
  projectName: string;
  location: string;
  issuedOn: string;
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  adjustment: number;
  taxPercent: number;
  tax: number;
  total: number;
  exclusions: string;
  terms: string;
  validity: string;
};

function isObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value) && Types.ObjectId.isValid(value);
}

function toProject(doc: {
  _id: { toString(): string };
  name: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  location: string;
  discipline: "electrical" | "civil";
  description: string;
  updatedAt?: Date;
}): ProjectRecord {
  return {
    id: doc._id.toString(),
    name: doc.name,
    clientName: doc.clientName,
    clientEmail: doc.clientEmail,
    clientPhone: doc.clientPhone,
    location: doc.location,
    discipline: doc.discipline,
    description: doc.description,
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

export async function listProjects(ownerId: string, query?: string): Promise<ProjectRecord[]> {
  await connectToDatabase();
  const filter: Record<string, unknown> = { ownerId };
  const term = query?.trim();
  if (term) {
    const pattern = new RegExp(escapeRegex(term), "i");
    filter.$or = [{ name: pattern }, { clientName: pattern }, { location: pattern }];
  }
  const projects = await ProjectModel.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
  return projects.map((project) => toProject(project));
}

export async function getOwnedProject(
  ownerId: string,
  projectId: string,
): Promise<ProjectRecord | null> {
  if (!isObjectId(projectId) || !isObjectId(ownerId)) {
    return null;
  }
  await connectToDatabase();
  const project = await ProjectModel.findOne({ _id: projectId, ownerId }).lean();
  return project ? toProject(project) : null;
}

export async function createProject(ownerId: string, input: ProjectInput): Promise<ProjectRecord> {
  await connectToDatabase();
  const project = await ProjectModel.create({ ...input, ownerId });
  return toProject(project);
}

export async function updateOwnedProject(
  ownerId: string,
  projectId: string,
  input: ProjectInput,
): Promise<ProjectRecord | null> {
  if (!isObjectId(projectId)) {
    return null;
  }
  await connectToDatabase();
  const project = await ProjectModel.findOneAndUpdate(
    { _id: projectId, ownerId },
    input,
    { returnDocument: "after" },
  ).lean();
  return project ? toProject(project) : null;
}

export async function createEstimateDraft(
  ownerId: string,
  input: EstimateDraftInput,
): Promise<EstimateRecord | null> {
  const project = await getOwnedProject(ownerId, input.projectId);
  if (!project) {
    return null;
  }
  const estimate = await EstimateModel.create({
    ownerId,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    status: "draft",
    discipline: project.discipline,
    inputs: { description: input.description },
    calculationOutputs: [
      {
        version: 1,
        methodIds: [],
        results: null,
        createdAt: new Date(),
      },
    ],
  });
  return {
    id: estimate.id as string,
    projectId: project.id,
    projectName: project.name,
    title: estimate.title as string,
    description: estimate.description as string,
    status: "draft",
    discipline: project.discipline,
    calculationVersion: 1,
    updatedAt: new Date().toISOString(),
  };
}

export async function listEstimates(ownerId: string): Promise<EstimateRecord[]> {
  await connectToDatabase();
  const estimates = await EstimateModel.find({ ownerId }).sort({ updatedAt: -1 }).limit(50).lean();
  const projectIds = [...new Set(estimates.map((estimate) => String(estimate.projectId)))];
  const projects = await ProjectModel.find({ _id: { $in: projectIds }, ownerId })
    .select("name")
    .lean();
  const names = new Map(projects.map((project) => [String(project._id), project.name as string]));
  return estimates.map((estimate) => {
    const outputs = (estimate.calculationOutputs ?? []) as Array<{ version: number }>;
    const latest = outputs.at(-1);
    return {
      id: String(estimate._id),
      projectId: String(estimate.projectId),
      projectName: names.get(String(estimate.projectId)) ?? "Project",
      title: estimate.title as string,
      description: estimate.description as string,
      status: estimate.status as "draft" | "completed",
      discipline: estimate.discipline as "electrical" | "civil",
      calculationVersion: latest?.version ?? null,
      updatedAt: (estimate.updatedAt as Date).toISOString(),
    };
  });
}

export type EstimateDetail = {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  location: string;
  title: string;
  description: string;
  status: "draft" | "completed";
  discipline: "electrical" | "civil";
  inputs: CalculateEstimateInput | null;
  boq: PricedBoq | null;
  calculationVersion: number | null;
};

export async function getOwnedEstimate(ownerId: string, estimateId: string): Promise<EstimateDetail | null> {
  if (!isObjectId(estimateId) || !isObjectId(ownerId)) {
    return null;
  }
  await connectToDatabase();
  const estimate = await EstimateModel.findOne({ _id: estimateId, ownerId }).lean();
  if (!estimate) {
    return null;
  }
  const project = await ProjectModel.findOne({ _id: estimate.projectId, ownerId }).lean();
  if (!project) {
    return null;
  }
  const outputs = (estimate.calculationOutputs ?? []) as Array<{ version: number; results?: PricedBoq | null }>;
  const latest = outputs.at(-1);
  const parsedInputs = calculateEstimateSchema.safeParse(estimate.inputs);
  const boq = latest?.results && Array.isArray(latest.results.lines) ? latest.results : null;
  return {
    id: String(estimate._id),
    projectId: String(project._id),
    projectName: project.name as string,
    clientName: project.clientName as string,
    location: project.location as string,
    title: estimate.title as string,
    description: estimate.description as string,
    status: estimate.status as "draft" | "completed",
    discipline: estimate.discipline as "electrical" | "civil",
    inputs: parsedInputs.success ? parsedInputs.data : null,
    boq,
    calculationVersion: latest?.version ?? null,
  };
}

export async function setEstimateStatus(
  ownerId: string,
  estimateId: string,
  status: "draft" | "completed",
): Promise<boolean> {
  if (!isObjectId(estimateId)) {
    return false;
  }
  await connectToDatabase();
  const updated = await EstimateModel.updateOne({ _id: estimateId, ownerId }, { status });
  return updated.matchedCount === 1;
}

export async function listQuotations(ownerId: string): Promise<QuotationSummary[]> {
  await connectToDatabase();
  const quotations = await QuotationModel.find({ ownerId })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select("number projectId updatedAt")
    .lean();
  return quotations.map((quotation) => ({
    id: String(quotation._id),
    number: quotation.number as string,
    projectId: String(quotation.projectId),
    updatedAt: (quotation.updatedAt as Date).toISOString(),
  }));
}

export async function saveQuotationSnapshot(input: {
  ownerId: string;
  projectId: string;
  estimateId: string;
  number: string;
  snapshot: QuotationSnapshot;
}): Promise<{ id: string; subtotal: number }> {
  await connectToDatabase();
  const project = await getOwnedProject(input.ownerId, input.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  const estimate = await EstimateModel.findOne({
    _id: input.estimateId,
    ownerId: input.ownerId,
    projectId: input.projectId,
  })
    .select("_id")
    .lean();
  if (!estimate) {
    throw new Error("Estimate not found.");
  }

  const snapshot = structuredClone(input.snapshot);
  try {
    const quotation = await QuotationModel.create({
      ownerId: input.ownerId,
      projectId: input.projectId,
      estimateId: input.estimateId,
      number: input.number,
      snapshot: { ...snapshot, capturedAt: new Date() },
    });
    return { id: String(quotation._id), subtotal: snapshot.subtotal };
  } catch (error) {
    if (isDuplicateNumber(error)) {
      throw new DuplicateQuotationNumberError();
    }
    throw error;
  }
}

export class DuplicateQuotationNumberError extends Error {
  constructor() {
    super("That quotation number is already used.");
    this.name = "DuplicateQuotationNumberError";
  }
}

export type QuotationRecord = {
  id: string;
  number: string;
  projectId: string;
  estimateId: string;
  snapshot: QuotationSnapshot;
  updatedAt: string;
};

export async function getOwnedQuotation(
  ownerId: string,
  quotationId: string,
): Promise<QuotationRecord | null> {
  if (!isObjectId(quotationId)) {
    return null;
  }
  await connectToDatabase();
  const quotation = await QuotationModel.findOne({ _id: quotationId, ownerId }).lean();
  return quotation ? toQuotation(quotation) : null;
}

export async function updateOwnedQuotation(
  ownerId: string,
  quotationId: string,
  number: string,
  snapshot: QuotationSnapshot,
): Promise<QuotationRecord | null> {
  if (!isObjectId(quotationId)) {
    return null;
  }
  await connectToDatabase();
  try {
    const quotation = await QuotationModel.findOneAndUpdate(
      { _id: quotationId, ownerId },
      { number, snapshot: { ...structuredClone(snapshot), capturedAt: new Date() } },
      { returnDocument: "after" },
    ).lean();
    return quotation ? toQuotation(quotation) : null;
  } catch (error) {
    if (isDuplicateNumber(error)) {
      throw new DuplicateQuotationNumberError();
    }
    throw error;
  }
}

export async function readQuotationSubtotal(
  ownerId: string,
  quotationId: string,
): Promise<number | null> {
  await connectToDatabase();
  const quotation = await QuotationModel.findOne({ _id: quotationId, ownerId })
    .select("snapshot.subtotal")
    .lean();
  if (!quotation) {
    return null;
  }
  return (quotation.snapshot as { subtotal: number }).subtotal;
}

export async function countWorkspace(ownerId: string): Promise<{
  projects: number;
  draftEstimates: number;
  completedEstimates: number;
}> {
  await connectToDatabase();
  const [projects, draftEstimates, completedEstimates] = await Promise.all([
    ProjectModel.countDocuments({ ownerId }),
    EstimateModel.countDocuments({ ownerId, status: "draft" }),
    EstimateModel.countDocuments({ ownerId, status: "completed" }),
  ]);
  return { projects, draftEstimates, completedEstimates };
}

function toQuotation(doc: {
  _id: { toString(): string };
  number: string;
  projectId: { toString(): string };
  estimateId: { toString(): string };
  updatedAt?: Date;
  snapshot: Partial<QuotationSnapshot> & { items?: QuotationSnapshot["items"]; subtotal?: number };
}): QuotationRecord {
  const snapshot = doc.snapshot;
  return {
    id: doc._id.toString(),
    number: doc.number,
    projectId: String(doc.projectId),
    estimateId: String(doc.estimateId),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
    snapshot: {
      businessName: snapshot.businessName ?? "",
      clientName: snapshot.clientName ?? "",
      projectName: snapshot.projectName ?? "",
      location: snapshot.location ?? "",
      issuedOn: snapshot.issuedOn ?? "",
      items: snapshot.items ?? [],
      subtotal: snapshot.subtotal ?? 0,
      adjustment: snapshot.adjustment ?? 0,
      taxPercent: snapshot.taxPercent ?? 0,
      tax: snapshot.tax ?? 0,
      total: snapshot.total ?? snapshot.subtotal ?? 0,
      exclusions: snapshot.exclusions ?? "",
      terms: snapshot.terms ?? "",
      validity: snapshot.validity ?? "",
    },
  };
}

function isDuplicateNumber(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
