"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectSchema, type ProjectInput } from "@/lib/validation/schemas";

export function ProjectForm({
  mode,
  projectId,
  initialValues,
}: {
  mode: "create" | "edit";
  projectId?: string;
  initialValues?: ProjectInput;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: initialValues ?? {
      name: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      location: "",
      discipline: "electrical",
      description: "",
    },
  });

  async function onSubmit(values: ProjectInput) {
    setMessage(null);
    const response = await fetch(mode === "create" ? "/api/projects" : `/api/projects/${projectId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      project?: { id: string };
    } | null;
    if (!response.ok || !body?.project) {
      setMessage(body?.message ?? "Could not save the project.");
      return;
    }
    router.push(`/projects/${body.project.id}`);
    router.refresh();
  }

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Field label="Project name" htmlFor="name" error={form.formState.errors.name?.message}>
        <Input id="name" {...form.register("name")} />
      </Field>
      <Field label="Client name" htmlFor="clientName" error={form.formState.errors.clientName?.message}>
        <Input id="clientName" {...form.register("clientName")} />
      </Field>
      <Field label="Client email" htmlFor="clientEmail" error={form.formState.errors.clientEmail?.message}>
        <Input id="clientEmail" type="email" {...form.register("clientEmail")} />
      </Field>
      <Field label="Client phone" htmlFor="clientPhone" error={form.formState.errors.clientPhone?.message}>
        <Input id="clientPhone" {...form.register("clientPhone")} />
      </Field>
      <Field label="Location" htmlFor="location" error={form.formState.errors.location?.message}>
        <Input id="location" {...form.register("location")} />
      </Field>
      <Field label="Discipline" htmlFor="discipline" error={form.formState.errors.discipline?.message}>
        <select
          id="discipline"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          {...form.register("discipline")}
        >
          <option value="electrical">Electrical</option>
          <option value="civil">Civil</option>
        </select>
      </Field>
      <Field label="Description" htmlFor="description" error={form.formState.errors.description?.message}>
        <Textarea id="description" {...form.register("description")} />
      </Field>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
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
