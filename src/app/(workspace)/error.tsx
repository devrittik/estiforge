"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Could not load your workspace</h1>
        <p className="text-sm leading-6 text-muted-foreground">{error.message}</p>
        <div>
          <Button type="button" variant="outline" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
