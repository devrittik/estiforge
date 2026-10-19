"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Item = {
  description: string;
  unit: "nos" | "m";
  quantity: string;
  rate: string;
};

export function QuotationEditor({
  mode,
  quotationId,
  estimateId,
  initial,
}: {
  mode: "create" | "edit";
  quotationId?: string;
  estimateId: string;
  initial: {
    number: string;
    businessName: string;
    issuedOn: string;
    adjustment: number;
    taxPercent: number;
    exclusions: string;
    terms: string;
    validity: string;
    items: Array<{ description: string; unit: "nos" | "m"; quantity: number; rate: number; amount?: number }>;
    clientName: string;
    projectName: string;
    location: string;
  };
}) {
  const router = useRouter();
  const [number, setNumber] = useState(initial.number);
  const [businessName, setBusinessName] = useState(initial.businessName);
  const [issuedOn, setIssuedOn] = useState(initial.issuedOn);
  const [adjustment, setAdjustment] = useState(String(initial.adjustment));
  const [taxPercent, setTaxPercent] = useState(String(initial.taxPercent));
  const [exclusions, setExclusions] = useState(initial.exclusions);
  const [terms, setTerms] = useState(initial.terms);
  const [validity, setValidity] = useState(initial.validity);
  const [items, setItems] = useState<Item[]>(
    initial.items.map((item) => ({
      description: item.description,
      unit: item.unit,
      quantity: String(item.quantity),
      rate: String(item.rate),
    })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    const response = await fetch(mode === "create" ? "/api/quotations" : `/api/quotations/${quotationId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        estimateId,
        number,
        businessName,
        issuedOn,
        adjustment: Number(adjustment),
        taxPercent: Number(taxPercent),
        exclusions,
        terms,
        validity,
        items: items.map((item) => ({
          description: item.description,
          unit: item.unit,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
        })),
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      quotation?: { id: string };
    } | null;
    setPending(false);
    if (!response.ok || !body?.quotation) {
      setMessage(body?.message ?? "Could not save the quotation.");
      return;
    }
    router.push(`/quotations/${body.quotation.id}`);
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)} noValidate>
      <p className="text-sm text-muted-foreground">
        {initial.clientName} · {initial.projectName} · {initial.location}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Quotation number" htmlFor="number">
          <Input id="number" value={number} onChange={(event) => setNumber(event.target.value)} />
        </Field>
        <Field label="Business name" htmlFor="businessName">
          <Input id="businessName" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
        </Field>
        <Field label="Issued on" htmlFor="issuedOn">
          <Input id="issuedOn" type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
        </Field>
        <Field label="Validity" htmlFor="validity">
          <Input id="validity" value={validity} onChange={(event) => setValidity(event.target.value)} />
        </Field>
        <Field label="Adjustment" htmlFor="quote-adjustment">
          <Input id="quote-adjustment" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} />
        </Field>
        <Field label="Tax %" htmlFor="quote-tax">
          <Input id="quote-tax" value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)} />
        </Field>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 pr-2 font-medium">Description</th>
              <th className="py-2 pr-2 font-medium">Unit</th>
              <th className="py-2 pr-2 font-medium">Quantity</th>
              <th className="py-2 font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.description}-${index}`} className="border-t border-border">
                <td className="py-2 pr-2">
                  <Input
                    aria-label={`Description ${index + 1}`}
                    value={item.description}
                    onChange={(event) => replaceItem(setItems, index, { description: event.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">{item.unit}</td>
                <td className="py-2 pr-2">
                  <Input
                    aria-label={`Quantity ${index + 1}`}
                    value={item.quantity}
                    onChange={(event) => replaceItem(setItems, index, { quantity: event.target.value })}
                  />
                </td>
                <td className="py-2">
                  <Input
                    aria-label={`Rate ${index + 1}`}
                    value={item.rate}
                    onChange={(event) => replaceItem(setItems, index, { rate: event.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Field label="Exclusions" htmlFor="exclusions">
        <Textarea id="exclusions" value={exclusions} onChange={(event) => setExclusions(event.target.value)} />
      </Field>
      <Field label="Terms" htmlFor="terms">
        <Textarea id="terms" value={terms} onChange={(event) => setTerms(event.target.value)} />
      </Field>
      <p className="text-sm text-muted-foreground">
        Amounts are recalculated when you save. The saved snapshot does not follow later rate-book edits.
      </p>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save quotation"}
      </Button>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function replaceItem(setItems: React.Dispatch<React.SetStateAction<Item[]>>, index: number, patch: Partial<Item>) {
  setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
}
