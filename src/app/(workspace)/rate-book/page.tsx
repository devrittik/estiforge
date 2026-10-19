import { Suspense } from "react";

import { RateBookPanel } from "@/components/forms/rate-book-panel";
import { getCurrentUser } from "@/lib/auth/accounts";
import { listCalculations } from "@/lib/calculations/registry";
import { listRateItems } from "@/lib/db/rate-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RateBookPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; discipline?: string }>;
}) {
  const calculations = listCalculations();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Rate book</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Material and labour rates used by the electrical quantity methods. Estimates do not invent prices.
        </p>
      </div>
      <ul className="grid gap-2">
        {calculations.map((calculation) => (
          <li key={calculation.id} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-sm font-medium">
              {calculation.name}{" "}
              <span className="font-normal text-muted-foreground">
                {calculation.id} v{calculation.version}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{calculation.formula}</p>
          </li>
        ))}
      </ul>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading rates…</p>}>
        <RateResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RateResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; discipline?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const q = params.q ?? "";
  const discipline = params.discipline ?? "";
  const items = await listRateItems(user.id, { q, discipline });

  return (
    <>
      <form className="flex max-w-xl flex-wrap gap-2" action="/rate-book">
        <Input name="q" defaultValue={q} placeholder="Search rates" aria-label="Search rates" />
        <select
          name="discipline"
          defaultValue={discipline}
          aria-label="Filter by discipline"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">All disciplines</option>
          <option value="electrical">Electrical</option>
          <option value="civil">Civil</option>
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      <RateBookPanel
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          materialRate: item.materialRate,
          labourRate: item.labourRate,
          wastagePercent: item.wastagePercent,
          discipline: item.discipline,
          catalogueCode: item.catalogueCode === "" ? "" : item.catalogueCode,
        }))}
      />
    </>
  );
}
