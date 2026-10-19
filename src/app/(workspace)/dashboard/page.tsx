import { Suspense } from "react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/accounts";
import { countWorkspace, listEstimates, listProjects, listQuotations } from "@/lib/db/records";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading dashboard…</p>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  const [counts, projects, estimates, quotations] = await Promise.all([
    countWorkspace(user.id),
    listProjects(user.id),
    listEstimates(user.id),
    listQuotations(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Projects and drafts saved for {user.name}.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/projects/new">New project</Link>
          </Button>
          <Button asChild>
            <Link href="/estimates/new">New estimate</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Projects" value={counts.projects} />
        <Stat label="Draft estimates" value={counts.draftEstimates} />
        <Stat label="Completed estimates" value={counts.completedEstimates} />
      </section>

      {counts.projects === 0 ? (
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-medium">No projects yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Create a project with the client and site details. Estimates stay attached to that
            project.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/projects/new">Create the first project</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <RecordList
          title="Recent projects"
          empty="Saved projects will appear here."
          rows={projects.slice(0, 5).map((project) => ({
            id: project.id,
            href: `/projects/${project.id}`,
            title: project.name,
            detail: `${project.clientName} · ${project.location}`,
          }))}
        />
        <RecordList
          title="Recent estimates"
          empty="Draft estimates will appear here."
          rows={estimates.slice(0, 5).map((estimate) => ({
            id: estimate.id,
            href: `/estimates/${estimate.id}`,
            title: estimate.title,
            detail: `${estimate.status} · ${estimate.projectName}`,
          }))}
        />
      </div>

      <RecordList
        title="Recent quotations"
        empty="Save a quotation from a calculated estimate."
        rows={quotations.map((quotation) => ({
          id: quotation.id,
          href: `/quotations/${quotation.id}`,
          title: quotation.number,
          detail: "Saved snapshot",
        }))}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function RecordList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{ id: string; href: string; title: string; detail: string }>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className="block rounded-md px-2 py-2 hover:bg-muted">
                <span className="block text-sm font-medium">{row.title}</span>
                <span className="block text-sm text-muted-foreground">{row.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
