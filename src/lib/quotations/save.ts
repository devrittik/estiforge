import "server-only";

import { repriceQuotation } from "@/lib/quotations/document";
import { getOwnedEstimate, saveQuotationSnapshot, setEstimateStatus, updateOwnedQuotation } from "@/lib/db/records";
import type { QuotationDraftInput } from "@/lib/validation/schemas";

export class QuotationSaveError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "QuotationSaveError";
  }
}

export async function createOwnedQuotation(ownerId: string, draft: QuotationDraftInput) {
  const estimate = await getOwnedEstimate(ownerId, draft.estimateId);
  if (!estimate) {
    throw new QuotationSaveError("Estimate not found.", 404);
  }
  if (!estimate.boq) {
    throw new QuotationSaveError("Calculate the estimate before creating a quotation.", 400);
  }
  const priced = priceDraft(draft, estimate);
  if (!priced.ok) {
    throw new QuotationSaveError(priced.message, 400);
  }
  const saved = await saveQuotationSnapshot({
    ownerId,
    projectId: estimate.projectId,
    estimateId: estimate.id,
    number: draft.number,
    snapshot: {
      ...priced.document,
      exclusions: draft.exclusions,
      terms: draft.terms,
      validity: draft.validity,
    },
  });
  await setEstimateStatus(ownerId, estimate.id, "completed");
  return saved;
}

export async function reviseOwnedQuotation(ownerId: string, quotationId: string, draft: QuotationDraftInput) {
  const estimate = await getOwnedEstimate(ownerId, draft.estimateId);
  if (!estimate) {
    throw new QuotationSaveError("Estimate not found.", 404);
  }
  const priced = priceDraft(draft, estimate);
  if (!priced.ok) {
    throw new QuotationSaveError(priced.message, 400);
  }
  return updateOwnedQuotation(ownerId, quotationId, draft.number, {
    ...priced.document,
    exclusions: draft.exclusions,
    terms: draft.terms,
    validity: draft.validity,
  });
}

function priceDraft(
  draft: QuotationDraftInput,
  estimate: { clientName: string; projectName: string; location: string },
) {
  return repriceQuotation({
    number: draft.number,
    businessName: draft.businessName,
    clientName: estimate.clientName,
    projectName: estimate.projectName,
    location: estimate.location,
    issuedOn: draft.issuedOn,
    adjustment: draft.adjustment,
    taxPercent: draft.taxPercent,
    exclusions: draft.exclusions,
    terms: draft.terms,
    validity: draft.validity,
    items: draft.items,
  });
}
