import PDFDocument from "pdfkit";

import type { QuotationDocument } from "@/lib/quotations/document";

export function renderQuotationPdf(document: QuotationDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.fontSize(18).text(`Quotation ${document.number}`);
    pdf.moveDown(0.4);
    pdf.fontSize(10).fillColor("#444444");
    pdf.text(document.businessName);
    pdf.text(`Issued ${document.issuedOn}`);
    pdf.moveDown(0.6);
    pdf.fillColor("#111111").fontSize(11);
    pdf.text(`Client: ${document.clientName}`);
    pdf.text(`Project: ${document.projectName}`);
    pdf.text(`Location: ${document.location}`);
    pdf.moveDown();

    pdf.fontSize(9).fillColor("#444444");
    pdf.text("Description", 48, pdf.y, { width: 230, continued: false });
    const headerY = pdf.y - 12;
    pdf.text("Unit", 280, headerY, { width: 40 });
    pdf.text("Qty", 320, headerY, { width: 60, align: "right" });
    pdf.text("Rate", 390, headerY, { width: 70, align: "right" });
    pdf.text("Amount", 470, headerY, { width: 70, align: "right" });
    pdf.moveDown(0.4);
    pdf.moveTo(48, pdf.y).lineTo(547, pdf.y).strokeColor("#cccccc").stroke();
    pdf.moveDown(0.4);

    pdf.fillColor("#111111").fontSize(10);
    for (const item of document.items) {
      if (pdf.y > 720) {
        pdf.addPage();
      }
      const rowY = pdf.y;
      pdf.text(item.description, 48, rowY, { width: 220 });
      const nextY = pdf.y;
      pdf.text(item.unit, 280, rowY, { width: 40 });
      pdf.text(formatQuantity(item.quantity, item.unit), 320, rowY, { width: 60, align: "right" });
      pdf.text(item.rate.toFixed(2), 390, rowY, { width: 70, align: "right" });
      pdf.text(item.amount.toFixed(2), 470, rowY, { width: 70, align: "right" });
      pdf.y = Math.max(pdf.y, nextY) + 6;
    }

    pdf.moveDown(0.5);
    const totals = [
      ["Subtotal", document.subtotal],
      ["Adjustment", document.adjustment],
      [`Tax ${document.taxPercent.toFixed(2)}%`, document.tax],
      ["Total", document.total],
    ] as const;
    for (const [label, amount] of totals) {
      pdf.fontSize(label === "Total" ? 12 : 10);
      pdf.text(`${label}  ${amount.toFixed(2)}`, 320, pdf.y, { width: 220, align: "right" });
      pdf.moveDown(0.2);
    }

    pdf.moveDown();
    pdf.fontSize(10).text(`Validity: ${document.validity || "—"}`, 48);
    pdf.moveDown(0.4);
    pdf.text("Exclusions");
    pdf.fontSize(9).fillColor("#333333").text(document.exclusions || "None stated.");
    pdf.moveDown(0.4);
    pdf.fillColor("#111111").fontSize(10).text("Terms");
    pdf.fontSize(9).fillColor("#333333").text(document.terms || "None stated.");
    pdf.moveDown();
    pdf.fontSize(8).fillColor("#666666").text(
      "Amounts are copied from the saved quotation snapshot. Later rate-book changes do not alter this document.",
    );
    pdf.end();
  });
}

function formatQuantity(quantity: number, unit: "nos" | "m"): string {
  return unit === "m" ? quantity.toFixed(3) : String(quantity);
}
