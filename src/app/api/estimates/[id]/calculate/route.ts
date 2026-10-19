import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { calculateOwnedEstimate, EstimateCalculationError } from "@/lib/db/estimate-calculations";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { logger } from "@/lib/logging/logger";
import { calculateEstimateSchema, fieldErrors } from "@/lib/validation/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = calculateEstimateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const result = await calculateOwnedEstimate(user.id, id, parsed.data);
    logger.info(
      {
        module: "calculations",
        operation: "run",
        userId: user.id,
        estimateId: id,
        version: result.version,
        methodIds: result.boq.methodIds,
      },
      "estimate calculated",
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EstimateCalculationError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    logger.error(
      { module: "calculations", operation: "run", errorName: error instanceof Error ? error.name : "Error" },
      "estimate calculation failed",
    );
    return NextResponse.json({ message: "Could not calculate the estimate." }, { status: 500 });
  }
}
