import { rateItemSchema, type RateItemInput } from "@/lib/validation/schemas";

const headers = [
  "name",
  "unit",
  "materialRate",
  "labourRate",
  "wastagePercent",
  "discipline",
  "catalogueCode",
] as const;

export function rateItemsToCsv(items: RateItemInput[]): string {
  const rows = items.map((item) => headers.map((header) => csvCell(String(item[header]))).join(","));
  return [headers.join(","), ...rows].join("\n");
}

export function parseRateItemCsv(text: string):
  | { ok: true; items: RateItemInput[] }
  | { ok: false; message: string } {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { ok: false, message: "The CSV file is empty." };
  }
  const header = rows[0]?.map((cell) => cell.trim()) ?? [];
  if (header.join(",") !== headers.join(",")) {
    return { ok: false, message: `Use the header ${headers.join(",")}.` };
  }
  if (rows.length > 201) {
    return { ok: false, message: "Import at most 200 rate items at a time." };
  }

  const items: RateItemInput[] = [];
  for (const [index, row] of rows.slice(1).entries()) {
    if (row.every((cell) => cell.trim() === "")) {
      continue;
    }
    const record = Object.fromEntries(headers.map((key, cell) => [key, row[cell]?.trim() ?? ""]));
    const parsed = rateItemSchema.safeParse({
      ...record,
      materialRate: Number(record.materialRate),
      labourRate: Number(record.labourRate),
      wastagePercent: Number(record.wastagePercent),
    });
    if (!parsed.success) {
      return {
        ok: false,
        message: `Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "invalid rate item."}`,
      };
    }
    items.push(parsed.data);
  }
  if (items.length === 0) {
    return { ok: false, message: "The CSV file has no rate items." };
  }
  return { ok: true, items };
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
