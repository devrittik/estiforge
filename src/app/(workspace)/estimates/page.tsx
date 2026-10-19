import { Suspense } from "react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/accounts";
import { listEstimates } from "@/lib/db/records";
import { Button } from "@/components/ui/button";

export default function EstimatesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading estimates…</p>}>
      <EstimateList />
    </Suspense>
  );
}

async function EstimateList() {
  const user = await getCurrentUser();
  const estimates = await listEstimates(user.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Estimates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open an estimate to enter quantities, calculate the bill of quantities, and save a quotation.
          </p>
        </div>
        <Button asChild>
          <Link href="/estimates/new">New draft</Link>
        </Button>
      </div>
      {estimates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No estimates saved yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {estimates.map((estimate) => (
            <li key={estimate.id} className="rounded-lg border border-border bg-card px-4 py-3">
              <Link href={`/estimates/${estimate.id}`} className="text-sm font-medium">
                {estimate.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {estimate.projectName} · {estimate.status} · calculation v
                {estimate.calculationVersion ?? 0}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
