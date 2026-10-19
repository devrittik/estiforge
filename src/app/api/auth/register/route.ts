import { NextResponse } from "next/server";

import { AccountExistsError, registerUser } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { logger } from "@/lib/logging/logger";
import { fieldErrors, registerSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const user = await registerUser(parsed.data);
    await createSession(user.id);
    logger.info({ module: "auth", operation: "register", userId: user.id }, "user registered");
    return NextResponse.json({ user: { id: user.id, name: user.name } }, { status: 201 });
  } catch (error) {
    if (error instanceof AccountExistsError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    logger.error(
      { module: "auth", operation: "register", errorName: error instanceof Error ? error.name : "Error" },
      "registration failed",
    );
    return NextResponse.json({ message: "Could not create the account." }, { status: 500 });
  }
}
