import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { updateOwnedRateItem } from "@/lib/db/rate-items";
import { logger } from "@/lib/logging/logger";
import { fieldErrors, rateItemSchema } from "@/lib/validation/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = rateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  try {
    const item = await updateOwnedRateItem(user.id, id, parsed.data);
    if (!item) {
      return NextResponse.json({ message: "Rate item not found." }, { status: 404 });
    }
    logger.info({ module: "rate-book", operation: "update", userId: user.id, rateItemId: item.id }, "rate item updated");
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    throw error;
  }
}
