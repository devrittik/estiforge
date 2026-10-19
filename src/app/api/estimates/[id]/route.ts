import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { setEstimateStatus } from "@/lib/db/records";
import { estimateStatusSchema, fieldErrors } from "@/lib/validation/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = estimateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  const updated = await setEstimateStatus(user.id, id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ message: "Estimate not found." }, { status: 404 });
  }
  return NextResponse.json({ status: parsed.data.status });
}
