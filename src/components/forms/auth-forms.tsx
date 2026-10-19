"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validation/schemas";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setMessage(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setMessage(body?.message ?? "Could not log in.");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Field label="Email" error={form.formState.errors.email?.message} htmlFor="email">
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message} htmlFor="password">
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      preferredDiscipline: "electrical",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setMessage(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setMessage(body?.message ?? "Could not create the account.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Field label="Name" error={form.formState.errors.name?.message} htmlFor="name">
        <Input id="name" autoComplete="name" {...form.register("name")} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message} htmlFor="email">
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message} htmlFor="password">
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Field
        label="Preferred discipline"
        error={form.formState.errors.preferredDiscipline?.message}
        htmlFor="preferredDiscipline"
      >
        <select
          id="preferredDiscipline"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          {...form.register("preferredDiscipline")}
        >
          <option value="electrical">Electrical</option>
          <option value="civil">Civil</option>
        </select>
      </Field>
      <p className="text-sm text-muted-foreground">
        Use at least 8 characters with a letter, a number, and a symbol.
      </p>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creating account…" : "Create account"}
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
