"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function QuotationDownloads({ quotationId }: { quotationId: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function download(kind: "pdf" | "csv") {
    setMessage(null);
    const response = await fetch(`/api/quotations/${quotationId}/${kind}`);
    if (!response.ok) {
      setMessage("Could not download the quotation.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quotation.${kind}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => void download("pdf")}>
          PDF
        </Button>
        <Button type="button" variant="outline" onClick={() => void download("csv")}>
          CSV
        </Button>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
