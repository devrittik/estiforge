import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { getOwnedProject, updateOwnedProject } from "@/lib/db/records";
import { logger } from "@/lib/logging/logger";
import { fieldErrors, projectSchema } from "@/lib/validation/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const project = await getOwnedProject(user.id, id);
    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const project = await updateOwnedProject(user.id, id, parsed.data);
    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }
    logger.info(
      { module: "projects", operation: "update", userId: user.id, projectId: project.id },
      "project updated",
    );
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    logger.error(
      { module: "projects", operation: "update", errorName: error instanceof Error ? error.name : "Error" },
      "project update failed",
    );
    return NextResponse.json({ message: "Could not update the project." }, { status: 500 });
  }
}
