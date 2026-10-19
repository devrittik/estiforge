import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/accounts";
import { ProjectForm } from "@/components/forms/project-form";
import { getOwnedProject } from "@/lib/db/records";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const project = await getOwnedProject(user.id, id);
  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.clientName} · {project.location}
        </p>
      </div>
      <ProjectForm
        mode="edit"
        projectId={project.id}
        initialValues={{
          name: project.name,
          clientName: project.clientName,
          clientEmail: project.clientEmail,
          clientPhone: project.clientPhone,
          location: project.location,
          discipline: project.discipline,
          description: project.description,
        }}
      />
    </div>
  );
}
