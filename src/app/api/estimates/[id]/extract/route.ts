import { NextResponse } from "next/server";

import { extractRequirements } from "@/lib/ai/extract";
import { modelFromEnv } from "@/lib/ai/provider";
import { requireUser } from "@/lib/auth/accounts";
import { getOwnedEstimate } from "@/lib/db/records";
import { logger } from "@/lib/logging/logger";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  description: z.string().trim().min(1, { error: "Describe the work first." }).max(4000),
});

export async function POST(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const estimate = await getOwnedEstimate(user.id, id);
  if (!estimate) {
    return NextResponse.json({ message: "Estimate not found." }, { status: 404 });
  }
  if (estimate.discipline !== "electrical") {
    return NextResponse.json(
      { message: "Civil calculations are not supported. Enter quantities manually if a method exists." },
      { status: 422 },
    );
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Describe the work first." }, { status: 400 });
  }

  const result = await extractRequirements(parsed.data.description, modelFromEnv());
  logger.info(
    {
      module: "ai",
      operation: "extract",
      userId: user.id,
      estimateId: id,
      provider: result.provider,
      accepted: result.ok,
    },
    "requirement extraction finished",
  );
  if (!result.ok) {
    return NextResponse.json({ message: result.message, provider: result.provider }, { status: 422 });
  }
  return NextResponse.json({ provider: result.provider, suggestion: result.suggestion });
}
