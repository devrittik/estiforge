import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuotationEditor } from "@/components/forms/quotation-editor";
import { getCurrentUser } from "@/lib/auth/accounts";
import { getOwnedEstimate, listQuotations } from "@/lib/db/records";

export default function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ estimate?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading quotation…</p>}>
      <NewQuotation searchParams={searchParams} />
    </Suspense>
  );
}

async function NewQuotation({
  searchParams,
}: {
  searchParams: Promise<{ estimate?: string }>;
}) {
  const user = await getCurrentUser();
  const { estimate: estimateId = "" } = await searchParams;
  const estimate = await getOwnedEstimate(user.id, estimateId);
  if (!estimate) {
    notFound();
  }
  if (!estimate.boq) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Quotation</h1>
        <p className="text-sm text-muted-foreground">Calculate the estimate before creating a quotation.</p>
        <Link href={`/estimates/${estimate.id}`} className="text-sm underline-offset-4 hover:underline">
          Back to the estimate
        </Link>
      </div>
    );
  }

  const existing = await listQuotations(user.id);
  const issuedOn = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New quotation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lines start from the calculated bill of quantities. Saving stores a snapshot.
        </p>
      </div>
      <QuotationEditor
        mode="create"
        estimateId={estimate.id}
        initial={{
          number: `Q-${String(existing.length + 1).padStart(4, "0")}`,
          businessName: "",
          issuedOn,
          adjustment: estimate.boq.adjustment,
          taxPercent: estimate.boq.taxPercent,
          exclusions: "",
          terms: "",
          validity: "15 days",
          clientName: estimate.clientName,
          projectName: estimate.projectName,
          location: estimate.location,
          items: estimate.boq.lines.map((line) => ({
            description: line.description,
            unit: line.unit,
            quantity: line.quantity,
            rate: line.rate,
          })),
        }}
      />
    </div>
  );
}
