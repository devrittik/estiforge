"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { estimateDraftSchema, type EstimateDraftInput } from "@/lib/validation/schemas";

export function EstimateDraftForm({
  projects,
}: {
  projects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<EstimateDraftInput>({
    resolver: zodResolver(estimateDraftSchema),
    defaultValues: {
      projectId: projects[0]?.id ?? "",
      title: "",
      description: "",
    },
  });

  async function onSubmit(values: EstimateDraftInput) {
    setMessage(null);
    const response = await fetch("/api/estimates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      estimate?: { id: string };
    } | null;
    if (!response.ok || !body?.estimate) {
      setMessage(body?.message ?? "Could not save the estimate.");
      return;
    }
    router.push(`/estimates/${body.estimate.id}`);
    router.refresh();
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Field label="Project" htmlFor="projectId" error={form.formState.errors.projectId?.message}>
        <select
          id="projectId"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          {...form.register("projectId")}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" htmlFor="title" error={form.formState.errors.title?.message}>
        <Input id="title" {...form.register("title")} />
      </Field>
      <Field label="Work description" htmlFor="description" error={form.formState.errors.description?.message}>
        <Textarea id="description" {...form.register("description")} />
      </Field>
      <p className="text-sm text-muted-foreground">
        Saving opens the estimate so you can enter quantities and calculate the bill of quantities.
      </p>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving…" : "Save draft"}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
