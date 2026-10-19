import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/accounts";
import { EstimateDraftForm } from "@/components/forms/estimate-draft-form";
import { listProjects } from "@/lib/db/records";
import { Button } from "@/components/ui/button";

export default async function NewEstimatePage() {
  const user = await getCurrentUser();
  const projects = await listProjects(user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New estimate draft</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attach a description to one of your projects.
        </p>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Create a project before saving an estimate.</p>
          <Button className="mt-3" asChild>
            <Link href="/projects/new">New project</Link>
          </Button>
        </div>
      ) : (
        <EstimateDraftForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
      )}
    </div>
  );
}
