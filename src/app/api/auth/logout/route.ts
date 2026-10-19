import { NextResponse } from "next/server";

import { deleteSession } from "@/lib/auth/session";
import { logger } from "@/lib/logging/logger";

export async function POST(request: Request) {
  await deleteSession();
  logger.info({ module: "auth", operation: "logout" }, "user logged out");
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
