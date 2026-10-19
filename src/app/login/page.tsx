import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/components/forms/auth-forms";
import { AppShell } from "@/components/layout/app-shell";
import { safeNextPath } from "@/lib/validation/schemas";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the email and password for your EstiForge account.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign-in…</p>}>
          <LoginDestination searchParams={searchParams} />
        </Suspense>
        <p className="text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

async function LoginDestination({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm nextPath={safeNextPath(params.next)} />;
}
