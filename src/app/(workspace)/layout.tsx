import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth/accounts";
import { AppShell } from "@/components/layout/app-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </AppShell>
      }
    >
      <WorkspaceFrame>{children}</WorkspaceFrame>
    </Suspense>
  );
}

async function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <AppShell user={{ name: user.name }}>{children}</AppShell>;
}
