import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuotationDownloads } from "@/components/forms/quotation-downloads";
import { QuotationEditor } from "@/components/forms/quotation-editor";
import { getCurrentUser } from "@/lib/auth/accounts";
import { getOwnedQuotation } from "@/lib/db/records";

export default function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading quotation…</p>}>
      <QuotationDetail params={params} />
    </Suspense>
  );
}

async function QuotationDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const quotation = await getOwnedQuotation(user.id, id);
  if (!quotation) {
    notFound();
  }
  const snapshot = quotation.snapshot;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{quotation.number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Total {snapshot.total.toFixed(2)} · saved snapshot
          </p>
        </div>
        <QuotationDownloads quotationId={quotation.id} />
      </div>
      <QuotationEditor
        mode="edit"
        quotationId={quotation.id}
        estimateId={quotation.estimateId}
        initial={{
          number: quotation.number,
          businessName: snapshot.businessName,
          issuedOn: snapshot.issuedOn,
          adjustment: snapshot.adjustment,
          taxPercent: snapshot.taxPercent,
          exclusions: snapshot.exclusions,
          terms: snapshot.terms,
          validity: snapshot.validity,
          clientName: snapshot.clientName,
          projectName: snapshot.projectName,
          location: snapshot.location,
          items: snapshot.items.map((item) => ({
            description: item.description,
            unit: item.unit === "m" ? "m" : "nos",
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })),
        }}
      />
      <p className="text-sm text-muted-foreground">
        <Link href={`/estimates/${quotation.estimateId}`} className="underline-offset-4 hover:underline">
          Open the estimate
        </Link>
      </p>
    </div>
  );
}
