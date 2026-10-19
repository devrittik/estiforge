import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { DuplicateQuotationNumberError } from "@/lib/db/records";
import { logger } from "@/lib/logging/logger";
import { QuotationSaveError, reviseOwnedQuotation } from "@/lib/quotations/save";
import { fieldErrors, quotationDraftSchema } from "@/lib/validation/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = quotationDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  try {
    const quotation = await reviseOwnedQuotation(user.id, id, parsed.data);
    if (!quotation) {
      return NextResponse.json({ message: "Quotation not found." }, { status: 404 });
    }
    logger.info(
      { module: "quotations", operation: "update", userId: user.id, quotationId: quotation.id },
      "quotation snapshot updated",
    );
    return NextResponse.json({ quotation });
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
    throw error;
  }
}
