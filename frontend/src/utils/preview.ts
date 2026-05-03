import { SHOPIFY_FIELDS } from "../types";
import type { Mapping } from "../types";

// Client-side mirrors of backend normalization — used for live output preview only.
// The backend is authoritative for the downloaded file.

const SIZE_TOKENS = new Set([
  "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL",
  "36", "38", "40", "42", "44", "46",
]);

function clientSlugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clientNormalizePrice(value: string): string {
  let s = value.trim().replace(/[€$£]/g, "").trim();
  if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d{2}$/.test(s)) {
    s = s.replace(",", ".");
  } else {
    s = s.replace(",", "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? "" : n.toFixed(2);
}

function clientNormalizeQty(value: string): string {
  const n = parseInt(value.replace(/[^\d-]/g, ""), 10);
  return isNaN(n) ? "0" : String(n);
}

function extractSizeFromSku(sku: string): string | null {
  if (!sku) return null;
  const tokens = sku.trim().split(/[-_/ ]/);
  const last = (tokens[tokens.length - 1] ?? "").toUpperCase();
  return SIZE_TOKENS.has(last) ? last : null;
}

export interface PreviewMeta {
  hasDuplicateTitles: boolean;
  variantsWithSizeDetected: boolean;
  variantsWithoutSize: boolean;
  variantGroupsCount: number;
  variantRowsCount: number;
}

export function buildOutputPreview(
  columns: string[],
  rows: Record<string, string>[],
  mapping: Mapping
): { rows: Record<string, string>[]; meta: PreviewMeta } {
  const userMapsOpt1Name = !!mapping["Option1 Name"];
  const userMapsOpt1Value = !!mapping["Option1 Value"];

  // First pass: extract mapped fields
  const rawRows = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const field of SHOPIFY_FIELDS) {
      const col = mapping[field] ?? "";
      out[field] = col && columns.includes(col) ? (row[col] ?? "") : "";
    }
    return out;
  });

  // Count titles to detect variant groups
  const titleCounts = new Map<string, number>();
  for (const out of rawRows) {
    if (out["Title"]) {
      titleCounts.set(out["Title"], (titleCounts.get(out["Title"]) ?? 0) + 1);
    }
  }
  const duplicateTitles = new Set(
    [...titleCounts.entries()].filter(([, c]) => c > 1).map(([t]) => t)
  );

  let variantsWithSizeDetected = false;
  let variantsWithoutSize = false;

  // Second pass: normalize and apply option logic
  const outputRows = rawRows.map((out) => {
    if (!out["Handle"] && out["Title"]) out["Handle"] = clientSlugify(out["Title"]);
    if (!out["Published"]) out["Published"] = "TRUE";

    const isVariant = duplicateTitles.has(out["Title"]);

    if (isVariant && !userMapsOpt1Name && !userMapsOpt1Value) {
      const size = extractSizeFromSku(out["Variant SKU"]);
      if (size) {
        out["Option1 Name"] = "Size";
        out["Option1 Value"] = size;
        variantsWithSizeDetected = true;
      } else {
        variantsWithoutSize = true;
      }
    }

    if (!out["Option1 Name"]) out["Option1 Name"] = "Title";
    if (!out["Option1 Value"]) out["Option1 Value"] = "Default Title";

    if (out["Variant Price"]) {
      out["Variant Price"] = clientNormalizePrice(out["Variant Price"]);
    }
    out["Variant Inventory Qty"] = out["Variant Inventory Qty"]
      ? clientNormalizeQty(out["Variant Inventory Qty"])
      : "0";

    return out;
  });

  const variantRowsCount = [...titleCounts.entries()]
    .filter(([, c]) => c > 1)
    .reduce((sum, [, c]) => sum + c, 0);

  return {
    rows: outputRows,
    meta: {
      hasDuplicateTitles: duplicateTitles.size > 0,
      variantsWithSizeDetected,
      variantsWithoutSize,
      variantGroupsCount: duplicateTitles.size,
      variantRowsCount,
    },
  };
}
