"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { electricalCatalogue } from "@/modules/electrical/catalogue";
import { rateItemSchema, type RateItemInput } from "@/lib/validation/schemas";

export type RateRow = RateItemInput & { id: string };

const emptyRate: RateItemInput = {
  name: "",
  unit: "nos",
  materialRate: 0,
  labourRate: 0,
  wastagePercent: 0,
  discipline: "electrical",
  catalogueCode: "",
};

export function RateBookPanel({ items }: { items: RateRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<RateItemInput>({
    resolver: zodResolver(rateItemSchema),
    defaultValues: emptyRate,
  });

  async function onSubmit(values: RateItemInput) {
    setMessage(null);
    const response = await fetch(editingId ? `/api/rate-items/${editingId}` : "/api/rate-items", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setMessage(body?.message ?? "Could not save the rate item.");
      return;
    }
    setEditingId(null);
    form.reset(emptyRate);
    router.refresh();
  }

  function edit(item: RateRow) {
    setEditingId(item.id);
    form.reset({
      name: item.name,
      unit: item.unit,
      materialRate: item.materialRate,
      labourRate: item.labourRate,
      wastagePercent: item.wastagePercent,
      discipline: item.discipline,
      catalogueCode: item.catalogueCode,
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form className="grid max-w-xl gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <h2 className="text-lg font-medium">{editingId ? "Edit rate" : "Add rate"}</h2>
        <Field label="Name" htmlFor="name" error={form.formState.errors.name?.message}>
          <Input id="name" {...form.register("name")} />
        </Field>
        <Field label="Unit" htmlFor="unit" error={form.formState.errors.unit?.message}>
          <select id="unit" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("unit")}>
            <option value="nos">nos</option>
            <option value="m">m</option>
          </select>
        </Field>
        <Field label="Material rate" htmlFor="materialRate" error={form.formState.errors.materialRate?.message}>
          <Input id="materialRate" type="number" step="0.01" min="0" {...form.register("materialRate", { valueAsNumber: true })} />
        </Field>
        <Field label="Labour rate" htmlFor="labourRate" error={form.formState.errors.labourRate?.message}>
          <Input id="labourRate" type="number" step="0.01" min="0" {...form.register("labourRate", { valueAsNumber: true })} />
        </Field>
        <Field label="Wastage %" htmlFor="wastagePercent" error={form.formState.errors.wastagePercent?.message}>
          <Input id="wastagePercent" type="number" step="0.01" min="0" max="100" {...form.register("wastagePercent", { valueAsNumber: true })} />
        </Field>
        <Field label="Discipline" htmlFor="discipline" error={form.formState.errors.discipline?.message}>
          <select id="discipline" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("discipline")}>
            <option value="electrical">Electrical</option>
            <option value="civil">Civil</option>
          </select>
        </Field>
        <Field label="Catalogue item" htmlFor="catalogueCode" error={form.formState.errors.catalogueCode?.message}>
          <select id="catalogueCode" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" {...form.register("catalogueCode")}>
            <option value="">None</option>
            {electricalCatalogue.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} ({item.unit})
              </option>
            ))}
          </select>
        </Field>
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Save rate" : "Add rate"}</Button>
          {editingId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingId(null);
                form.reset(emptyRate);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="py-2 pr-3 font-medium">Unit</th>
              <th className="py-2 pr-3 font-medium">Material</th>
              <th className="py-2 pr-3 font-medium">Labour</th>
              <th className="py-2 pr-3 font-medium">Wastage</th>
              <th className="py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-muted-foreground">
                  No rates yet. Add the materials and labour you want estimates to use.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="py-2 pr-3">
                    {item.name}
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.discipline}</span>
                  </td>
                  <td className="py-2 pr-3">{item.unit}</td>
                  <td className="py-2 pr-3">{item.materialRate.toFixed(2)}</td>
                  <td className="py-2 pr-3">{item.labourRate.toFixed(2)}</td>
                  <td className="py-2 pr-3">{item.wastagePercent}%</td>
                  <td className="py-2 text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => edit(item)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CsvImport />
    </div>
  );
}

function CsvImport() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function downloadRates() {
    setMessage(null);
    const response = await fetch("/api/rate-items/csv");
    if (!response.ok) {
      setMessage("Could not export the rate book.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rate-book.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(file: File | undefined) {
    setMessage(null);
    if (!file) {
      return;
    }
    const csv = await file.text();
    const response = await fetch("/api/rate-items/csv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setMessage(body?.message ?? "Could not import the CSV file.");
      return;
    }
    router.refresh();
  }

  return (
    <form className="flex max-w-xl flex-col gap-2">
      <Label htmlFor="rate-csv">Import CSV</Label>
      <Input
        id="rate-csv"
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          void onImport(event.target.files?.[0]);
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void downloadRates();
        }}
      >
        Export CSV
      </Button>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
