"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RequirementSuggestion } from "@/lib/ai/extraction";
import { VoiceCapture } from "@/components/forms/voice-capture";
import type { PricedBoq } from "@/lib/calculations/boq";
import type { CalculateEstimateInput } from "@/lib/validation/schemas";
import { electricalCatalogue, findCatalogueItem, type CatalogueCode } from "@/modules/electrical/catalogue";

type RateChoice = {
  id: string;
  name: string;
  unit: "nos" | "m";
  materialRate: number;
  labourRate: number;
  wastagePercent: number;
};

type DraftLine = {
  key: string;
  catalogueCode: CatalogueCode;
  count: string;
  length: string;
  terminationCount: string;
  extraPerTermination: string;
  rateItemId: string;
  materialRate: string;
  labourRate: string;
  wastagePercent: string;
};

export function EstimateWorkspace({
  estimateId,
  discipline,
  status,
  inputs,
  boq,
  rates,
  description,
  voiceEnabled,
}: {
  estimateId: string;
  discipline: "electrical" | "civil";
  status: "draft" | "completed";
  inputs: CalculateEstimateInput | null;
  boq: PricedBoq | null;
  rates: RateChoice[];
  description: string;
  voiceEnabled: boolean;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<DraftLine[]>(() => linesFromInputs(inputs, rates));
  const [adjustment, setAdjustment] = useState(String(inputs?.adjustment ?? boq?.adjustment ?? 0));
  const [taxPercent, setTaxPercent] = useState(String(inputs?.taxPercent ?? boq?.taxPercent ?? 0));
  const [result, setResult] = useState<PricedBoq | null>(boq);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [workDescription, setWorkDescription] = useState(description);
  const [suggestion, setSuggestion] = useState<RequirementSuggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const grouped = useMemo(() => rates, [rates]);

  if (discipline !== "electrical") {
    return (
      <p className="text-sm text-muted-foreground">
        Civil calculations are not supported. This estimate cannot produce a bill of quantities.
      </p>
    );
  }

  if (grouped.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add electrical rates before calculating.{" "}
        <Link href="/rate-book" className="underline-offset-4 hover:underline">
          Open the rate book
        </Link>
      </p>
    );
  }

  async function calculate() {
    setMessage(null);
    setPending(true);
    const payload = {
      lines: lines.map((line) => {
        const item = findCatalogueItem(line.catalogueCode);
        const shared = {
          catalogueCode: line.catalogueCode,
          rateItemId: line.rateItemId,
          materialRate: Number(line.materialRate),
          labourRate: Number(line.labourRate),
          wastagePercent: Number(line.wastagePercent),
        };
        if (item?.unit === "m") {
          return {
            ...shared,
            segments: [{ length: Number(line.length) }],
            terminationCount: Number(line.terminationCount || 0),
            extraPerTermination: Number(line.extraPerTermination || 0),
          };
        }
        return { ...shared, count: Number(line.count) };
      }),
      adjustment: Number(adjustment),
      taxPercent: Number(taxPercent),
    };
    const response = await fetch(`/api/estimates/${estimateId}/calculate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as { message?: string; boq?: PricedBoq } | null;
    setPending(false);
    if (!response.ok || !body?.boq) {
      setMessage(body?.message ?? "Could not calculate the estimate.");
      return;
    }
    setResult(body.boq);
    router.refresh();
  }

  async function markCompleted() {
    setMessage(null);
    const response = await fetch(`/api/estimates/${estimateId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (!response.ok) {
      setMessage("Could not update the estimate status.");
      return;
    }
    router.refresh();
  }

  async function suggest() {
    setMessage(null);
    setSuggesting(true);
    const response = await fetch(`/api/estimates/${estimateId}/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: workDescription }),
    });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      suggestion?: RequirementSuggestion;
    } | null;
    setSuggesting(false);
    if (!response.ok || !body?.suggestion) {
      setSuggestion(null);
      setMessage(body?.message ?? "Enter the quantities manually.");
      return;
    }
    setSuggestion(body.suggestion);
  }

  function applySuggestion() {
    if (!suggestion || !suggestion.supported || suggestion.lines.length === 0) {
      return;
    }
    setLines(
      suggestion.lines.map((line) => {
        const item = findCatalogueItem(line.catalogueCode);
        const rate = grouped.find((entry) => entry.unit === item?.unit);
        const draft = blankLine(grouped, crypto.randomUUID());
        return {
          ...draft,
          catalogueCode: line.catalogueCode,
          count: line.count === null ? "" : String(line.count),
          length: line.length === null ? "" : String(line.length),
          terminationCount: line.terminationCount === null ? "0" : String(line.terminationCount),
          extraPerTermination: line.extraPerTermination === null ? "0" : String(line.extraPerTermination),
          rateItemId: rate?.id ?? "",
          materialRate: rate ? String(rate.materialRate) : "",
          labourRate: rate ? String(rate.labourRate) : "",
          wastagePercent: rate ? String(rate.wastagePercent) : "0",
        };
      }),
    );
    setMessage("Suggested quantities are in the form. They are not a bill of quantities until you calculate.");
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex max-w-xl flex-col gap-3">
        <h2 className="text-lg font-medium">Work description</h2>
        <VoiceCapture
          estimateId={estimateId}
          enabled={voiceEnabled}
          onTranscript={(transcript) =>
            setWorkDescription((current) => (current.trim() === "" ? transcript : `${current.trim()}\n${transcript}`))
          }
        />
        <Textarea
          aria-label="Work description"
          value={workDescription}
          onChange={(event) => setWorkDescription(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={() => void suggest()} disabled={suggesting || workDescription.trim() === ""}>
          {suggesting ? "Reading description…" : "Suggest quantities"}
        </Button>
        {suggestion ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium">AI suggestion · {suggestion.supported ? "review before use" : "not supported"}</p>
            <p className="mt-2 text-muted-foreground">{suggestion.summary}</p>
            <p className="mt-2 text-muted-foreground">{suggestion.explanation}</p>
            {suggestion.unsupportedReason ? <p className="mt-2">{suggestion.unsupportedReason}</p> : null}
            {suggestion.missing.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {suggestion.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {suggestion.supported && suggestion.lines.length > 0 ? (
              <Button type="button" className="mt-3" onClick={applySuggestion}>
                Use suggested quantities
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Quantities</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLines((current) => [...current, blankLine(grouped, crypto.randomUUID())])}
          >
            Add line
          </Button>
        </div>
        {lines.map((line, index) => {
          const item = findCatalogueItem(line.catalogueCode);
          const choices = grouped.filter((rate) => rate.unit === item?.unit);
          return (
            <fieldset key={line.key} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Line {index + 1}</legend>
              <label className="flex flex-col gap-1.5 text-sm">
                Catalogue
                <select
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={line.catalogueCode}
                  onChange={(event) => updateLine(setLines, line.key, { catalogueCode: event.target.value as CatalogueCode })}
                >
                  {electricalCatalogue.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.name} ({entry.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Rate
                <select
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={line.rateItemId}
                  onChange={(event) => {
                    const selected = grouped.find((rate) => rate.id === event.target.value);
                    updateLine(setLines, line.key, {
                      rateItemId: event.target.value,
                      materialRate: selected ? String(selected.materialRate) : line.materialRate,
                      labourRate: selected ? String(selected.labourRate) : line.labourRate,
                      wastagePercent: selected ? String(selected.wastagePercent) : line.wastagePercent,
                    });
                  }}
                >
                  <option value="">Choose a rate</option>
                  {choices.map((rate) => (
                    <option key={rate.id} value={rate.id}>
                      {rate.name}
                    </option>
                  ))}
                </select>
              </label>
              {item?.unit === "m" ? (
                <>
                  <NumberField label="Measured length (m)" value={line.length} onChange={(value) => updateLine(setLines, line.key, { length: value })} />
                  <NumberField label="Terminations" value={line.terminationCount} onChange={(value) => updateLine(setLines, line.key, { terminationCount: value })} />
                  <NumberField label="Extra per termination (m)" value={line.extraPerTermination} onChange={(value) => updateLine(setLines, line.key, { extraPerTermination: value })} />
                </>
              ) : (
                <NumberField label="Count" value={line.count} onChange={(value) => updateLine(setLines, line.key, { count: value })} />
              )}
              <NumberField label="Material rate" value={line.materialRate} onChange={(value) => updateLine(setLines, line.key, { materialRate: value })} />
              <NumberField label="Labour rate" value={line.labourRate} onChange={(value) => updateLine(setLines, line.key, { labourRate: value })} />
              <NumberField label="Wastage %" value={line.wastagePercent} onChange={(value) => updateLine(setLines, line.key, { wastagePercent: value })} />
              {lines.length > 1 ? (
                <div className="md:col-span-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => current.filter((entry) => entry.key !== line.key))}>
                    Remove line
                  </Button>
                </div>
              ) : null}
            </fieldset>
          );
        })}
        <div className="grid max-w-xl gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjustment">Adjustment</Label>
            <Input id="adjustment" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxPercent">Tax %</Label>
            <Input id="taxPercent" value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Counts and lengths are entered here. Rates start from your rate book and can be changed for this estimate.
          Status: {status}.
        </p>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void calculate()} disabled={pending}>
            {pending ? "Calculating…" : "Calculate"}
          </Button>
          {result ? (
            <Button type="button" variant="outline" onClick={() => void markCompleted()}>
              Mark completed
            </Button>
          ) : null}
          {result ? (
            <Button variant="outline" asChild>
              <Link href={`/quotations/new?estimate=${estimateId}`}>Create quotation</Link>
            </Button>
          ) : null}
        </div>
      </section>
      {result ? <BoqTable boq={result} /> : null}
    </div>
  );
}

function BoqTable({ boq }: { boq: PricedBoq }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Bill of quantities</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 font-medium">Method</th>
              <th className="py-2 pr-3 font-medium">Qty</th>
              <th className="py-2 pr-3 font-medium">Rate</th>
              <th className="py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {boq.lines.map((line) => (
              <tr key={`${line.catalogueCode}-${line.description}`} className="border-t border-border align-top">
                <td className="py-2 pr-3">
                  {line.description}
                  <span className="mt-1 block text-xs text-muted-foreground">{line.trace.join(" · ")}</span>
                </td>
                <td className="py-2 pr-3">
                  {line.methodId}
                  <span className="mt-1 block text-xs text-muted-foreground">v{line.methodVersion}</span>
                </td>
                <td className="py-2 pr-3">
                  {line.unit === "m" ? line.quantity.toFixed(3) : line.quantity} {line.unit}
                </td>
                <td className="py-2 pr-3">{line.rate.toFixed(2)}</td>
                <td className="py-2">{line.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid max-w-sm gap-1 text-sm">
        <Total label="Subtotal" value={boq.subtotal} />
        <Total label="Adjustment" value={boq.adjustment} />
        <Total label={`Tax ${boq.taxPercent}%`} value={boq.tax} />
        <Total label="Total" value={boq.total} />
      </dl>
      <p className="text-sm text-muted-foreground">{boq.lines[0]?.limitations.join(" ") ?? ""}</p>
    </section>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value.toFixed(2)}</dd>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label}
      <Input value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" />
    </label>
  );
}

function updateLine(setLines: React.Dispatch<React.SetStateAction<DraftLine[]>>, key: string, patch: Partial<DraftLine>) {
  setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
}

function linesFromInputs(inputs: CalculateEstimateInput | null, rates: RateChoice[]): DraftLine[] {
  if (!inputs || inputs.lines.length === 0) {
    return [blankLine(rates, "line-1")];
  }
  return inputs.lines.map((line, index) => {
    const rate = rates.find((item) => item.id === line.rateItemId);
    return {
      key: `${line.catalogueCode}-${index}`,
      catalogueCode: line.catalogueCode,
      count: String(line.count ?? ""),
      length: String(line.segments?.[0]?.length ?? ""),
      terminationCount: String(line.terminationCount ?? 0),
      extraPerTermination: String(line.extraPerTermination ?? 0),
      rateItemId: line.rateItemId,
      materialRate: String(line.materialRate ?? rate?.materialRate ?? ""),
      labourRate: String(line.labourRate ?? rate?.labourRate ?? ""),
      wastagePercent: String(line.wastagePercent ?? rate?.wastagePercent ?? 0),
    };
  });
}

function blankLine(rates: RateChoice[], key: string): DraftLine {
  const rate = rates.find((item) => item.unit === "nos") ?? rates[0];
  return {
    key,
    catalogueCode: "light-point",
    count: "",
    length: "",
    terminationCount: "0",
    extraPerTermination: "0",
    rateItemId: rate?.id ?? "",
    materialRate: rate ? String(rate.materialRate) : "",
    labourRate: rate ? String(rate.labourRate) : "",
    wastagePercent: rate ? String(rate.wastagePercent) : "0",
  };
}
