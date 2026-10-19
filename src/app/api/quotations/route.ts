import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { DuplicateQuotationNumberError } from "@/lib/db/records";
import { logger } from "@/lib/logging/logger";
import { createOwnedQuotation, QuotationSaveError } from "@/lib/quotations/save";
import { fieldErrors, quotationDraftSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = quotationDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  try {
    const quotation = await createOwnedQuotation(user.id, parsed.data);
    logger.info(
      { module: "quotations", operation: "create", userId: user.id, quotationId: quotation.id },
      "quotation snapshot saved",
    );
    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    if (error instanceof QuotationSaveError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    if (error instanceof DuplicateQuotationNumberError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    logger.error(
      { module: "quotations", operation: "create", errorName: error instanceof Error ? error.name : "Error" },
      "quotation save failed",
    );
    return NextResponse.json({ message: "Could not save the quotation." }, { status: 500 });
  }
}
