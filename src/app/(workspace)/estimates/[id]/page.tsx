import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EstimateWorkspace } from "@/components/forms/estimate-workspace";
import { getCurrentUser } from "@/lib/auth/accounts";
import { getEnv } from "@/lib/config/env";
import { listRateItems } from "@/lib/db/rate-items";
import { getOwnedEstimate } from "@/lib/db/records";

export default function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading estimate…</p>}>
      <EstimateDetail params={params} />
    </Suspense>
  );
}

async function EstimateDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const estimate = await getOwnedEstimate(user.id, id);
  if (!estimate) {
    notFound();
  }
  const rates = await listRateItems(user.id, { discipline: "electrical" });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/projects/${estimate.projectId}`} className="underline-offset-4 hover:underline">
            {estimate.projectName}
          </Link>{" "}
          · {estimate.clientName} · {estimate.location}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{estimate.title}</h1>
        {estimate.description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{estimate.description}</p>
        ) : null}
      </div>
      <EstimateWorkspace
        estimateId={estimate.id}
        discipline={estimate.discipline}
        status={estimate.status}
        inputs={estimate.inputs}
        boq={estimate.boq}
        description={estimate.description}
        voiceEnabled={getEnv().VOICE_STT_ENABLED === "true"}
        rates={rates.map((rate) => ({
          id: rate.id,
          name: rate.name,
          unit: rate.unit,
          materialRate: rate.materialRate,
          labourRate: rate.labourRate,
          wastagePercent: rate.wastagePercent,
        }))}
      />
    </div>
  );
}
