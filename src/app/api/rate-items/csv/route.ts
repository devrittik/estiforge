import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { parseRateItemCsv, rateItemsToCsv } from "@/lib/calculations/rate-csv";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { createRateItems, listRateItems } from "@/lib/db/rate-items";
import { logger } from "@/lib/logging/logger";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  try {
    const items = await listRateItems(user.id);
    const csv = rateItemsToCsv(items);
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=\"rate-book.csv\"",
      },
    });
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
  const body = (await request.json().catch(() => null)) as { csv?: unknown } | null;
  if (!body || typeof body.csv !== "string") {
    return NextResponse.json({ message: "Paste CSV text to import." }, { status: 400 });
  }
  const parsed = parseRateItemCsv(body.csv);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  try {
    const items = await createRateItems(user.id, parsed.items);
    logger.info(
      { module: "rate-book", operation: "import", userId: user.id, count: items.length },
      "rate items imported",
    );
    return NextResponse.json({ items }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    throw error;
  }
}
