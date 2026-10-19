import { NextResponse } from "next/server";

import { authenticateUser, InvalidCredentialsError } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { logger } from "@/lib/logging/logger";
import { fieldErrors, loginSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    await createSession(user.id);
    logger.info({ module: "auth", operation: "login", userId: user.id }, "user logged in");
    return NextResponse.json({ user: { id: user.id, name: user.name } });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    logger.error(
      { module: "auth", operation: "login", errorName: error instanceof Error ? error.name : "Error" },
      "login failed",
    );
    return NextResponse.json({ message: "Could not log in." }, { status: 500 });
  }
}
