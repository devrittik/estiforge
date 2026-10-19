import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/accounts";
import { DatabaseConnectionError } from "@/lib/db/mongo";
import { createProject, listProjects } from "@/lib/db/records";
import { logger } from "@/lib/logging/logger";
import { fieldErrors, projectSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const projects = await listProjects(user.id, query);
    return NextResponse.json({ projects });
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
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const project = await createProject(user.id, parsed.data);
    logger.info(
      { module: "projects", operation: "create", userId: user.id, projectId: project.id },
      "project created",
    );
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    logger.error(
      { module: "projects", operation: "create", errorName: error instanceof Error ? error.name : "Error" },
      "project create failed",
    );
    return NextResponse.json({ message: "Could not save the project." }, { status: 500 });
  }
}
