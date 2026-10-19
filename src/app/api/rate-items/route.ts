import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { createRateItem, listRateItems } from "@/lib/db/rate-items";
import { logger } from "@/lib/logging/logger";
import { fieldErrors, rateItemSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const url = new URL(request.url);
  try {
    const items = await listRateItems(user.id, {
      q: url.searchParams.get("q") ?? "",
      discipline: url.searchParams.get("discipline") ?? "",
    });
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = rateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  try {
    const item = await createRateItem(user.id, parsed.data);
    logger.info({ module: "rate-book", operation: "create", userId: user.id, rateItemId: item.id }, "rate item created");
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    logger.error(
      { module: "rate-book", operation: "create", errorName: error instanceof Error ? error.name : "Error" },
      "rate item create failed",
    );
    return NextResponse.json({ message: "Could not save the rate item." }, { status: 500 });
  }
}
