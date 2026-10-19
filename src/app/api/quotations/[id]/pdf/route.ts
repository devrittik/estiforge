import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { getOwnedQuotation } from "@/lib/db/records";
import type { QuotationDocument } from "@/lib/quotations/document";
import { renderQuotationPdf } from "@/lib/quotations/pdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const quotation = await getOwnedQuotation(user.id, id);
  if (!quotation) {
    return NextResponse.json({ message: "Quotation not found." }, { status: 404 });
  }
  const snapshot = quotation.snapshot;
  const document: QuotationDocument = {
    number: quotation.number,
    businessName: snapshot.businessName,
    clientName: snapshot.clientName,
    projectName: snapshot.projectName,
    location: snapshot.location,
    issuedOn: snapshot.issuedOn,
    items: snapshot.items.map((item) => ({
      description: item.description,
      unit: item.unit === "m" ? "m" : "nos",
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    })),
    subtotal: snapshot.subtotal,
    adjustment: snapshot.adjustment,
    taxPercent: snapshot.taxPercent,
    taxable: snapshot.subtotal + snapshot.adjustment,
    tax: snapshot.tax,
    total: snapshot.total,
    exclusions: snapshot.exclusions,
    terms: snapshot.terms,
    validity: snapshot.validity,
  };
  const pdf = await renderQuotationPdf(document);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${quotation.number.replace(/[^a-zA-Z0-9_-]+/g, "-")}.pdf"`,
    },
  });
}
