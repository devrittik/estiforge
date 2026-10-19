import { Suspense } from "react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/accounts";
import { listProjects } from "@/lib/db/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Only projects you own are listed.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">New project</Link>
        </Button>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading projects…</p>}>
        <ProjectResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProjectResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  const { q = "" } = await searchParams;
  const projects = await listProjects(user.id, q);

  return (
    <>
      <form className="flex max-w-md gap-2" action="/projects">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, client, or location"
          aria-label="Search projects"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {q ? "No projects match that search." : "Create a project to start an estimate."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id} className="rounded-lg border border-border bg-card px-4 py-3">
              <Link href={`/projects/${project.id}`} className="text-sm font-medium">
                {project.name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.clientName} · {project.location} · {project.discipline}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
