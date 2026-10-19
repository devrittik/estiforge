import Link from "next/link";

import { RegisterForm } from "@/components/forms/auth-forms";
import { AppShell } from "@/components/layout/app-shell";

export default function RegisterPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your projects stay private to this account.
          </p>
        </div>
        <RegisterForm />
        <p className="text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
