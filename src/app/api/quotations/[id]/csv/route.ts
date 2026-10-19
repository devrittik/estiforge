import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { getOwnedQuotation } from "@/lib/db/records";
import { quotationToCsv } from "@/lib/quotations/document";
import type { QuotationDocument } from "@/lib/quotations/document";

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
  const csv = quotationToCsv(toDocument(quotation.number, quotation.snapshot));
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safeFileName(quotation.number)}.csv"`,
    },
  });
}

function toDocument(
  number: string,
  snapshot: {
    businessName: string;
    clientName: string;
    projectName: string;
    location: string;
    issuedOn: string;
    items: Array<{ description: string; unit: string; quantity: number; rate: number; amount: number }>;
    subtotal: number;
    adjustment: number;
    taxPercent: number;
    tax: number;
    total: number;
    exclusions: string;
    terms: string;
    validity: string;
  },
): QuotationDocument {
  return {
    number,
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
}

function safeFileName(number: string): string {
  return number.replace(/[^a-zA-Z0-9_-]+/g, "-");
}
