import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { createEstimateDraft, listEstimates } from "@/lib/db/records";
import { logger } from "@/lib/logging/logger";
import { estimateDraftSchema, fieldErrors } from "@/lib/validation/schemas";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  try {
    const estimates = await listEstimates(user.id);
    return NextResponse.json({ estimates });
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
  const parsed = estimateDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const estimate = await createEstimateDraft(user.id, parsed.data);
    if (!estimate) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }
    logger.info(
      { module: "estimates", operation: "create", userId: user.id, estimateId: estimate.id },
      "estimate draft saved",
    );
    return NextResponse.json({ estimate }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    logger.error(
      { module: "estimates", operation: "create", errorName: error instanceof Error ? error.name : "Error" },
      "estimate create failed",
    );
    return NextResponse.json({ message: "Could not save the estimate." }, { status: 500 });
  }
}
