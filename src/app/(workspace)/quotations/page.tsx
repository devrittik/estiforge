import { Suspense } from "react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/accounts";
import { listQuotations } from "@/lib/db/records";

export default function QuotationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading quotations…</p>}>
      <QuotationList />
    </Suspense>
  );
}

async function QuotationList() {
  const user = await getCurrentUser();
  const quotations = await listQuotations(user.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Quotations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each quotation keeps the amounts from the moment it was saved.
        </p>
      </div>
      {quotations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create a quotation from a calculated{" "}
          <Link href="/estimates" className="underline-offset-4 hover:underline">
            estimate
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {quotations.map((quotation) => (
            <li key={quotation.id} className="rounded-lg border border-border bg-card px-4 py-3">
              <Link href={`/quotations/${quotation.id}`} className="text-sm font-medium">
                {quotation.number}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
