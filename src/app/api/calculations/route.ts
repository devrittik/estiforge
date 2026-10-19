import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { listCalculations } from "@/lib/calculations/registry";
import { electricalCatalogue } from "@/modules/electrical/catalogue";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json({
    calculations: listCalculations(),
    catalogue: electricalCatalogue,
  });
}
