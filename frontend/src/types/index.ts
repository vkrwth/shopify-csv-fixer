export const SHOPIFY_FIELDS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Option2 Name",
  "Option2 Value",
  "Variant SKU",
  "Variant Price",
  "Variant Inventory Qty",
  "Image Src",
] as const;

export type ShopifyField = (typeof SHOPIFY_FIELDS)[number];
export type Mapping = Record<string, string>;

export interface PreviewResponse {
  columns: string[];
  rows: Record<string, string>[];
}

export const REQUIRED_FIELDS: readonly ShopifyField[] = ["Title"];
export const RECOMMENDED_FIELDS: readonly ShopifyField[] = [
  "Variant SKU",
  "Variant Price",
];

export const FIELD_GROUPS: {
  basic: ShopifyField[];
  optional: ShopifyField[];
  advanced: ShopifyField[];
} = {
  basic: ["Title", "Variant SKU", "Variant Price", "Variant Inventory Qty", "Image Src"],
  optional: ["Body (HTML)", "Vendor", "Type", "Tags"],
  advanced: ["Handle", "Published", "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value"],
};

const AUTO_MAP_SYNONYMS: Record<string, ShopifyField> = {
  productname: "Title",
  "product name": "Title",
  name: "Title",
  product: "Title",
  "item name": "Title",
  description: "Body (HTML)",
  productdescription: "Body (HTML)",
  body: "Body (HTML)",
  "long description": "Body (HTML)",
  brand: "Vendor",
  vendor: "Vendor",
  manufacturer: "Vendor",
  supplier: "Vendor",
  category: "Type",
  "product type": "Type",
  type: "Type",
  tags: "Tags",
  keywords: "Tags",
  sku: "Variant SKU",
  articlenumber: "Variant SKU",
  itemcode: "Variant SKU",
  productcode: "Variant SKU",
  price: "Variant Price",
  retailprice: "Variant Price",
  saleprice: "Variant Price",
  unitprice: "Variant Price",
  stock: "Variant Inventory Qty",
  qty: "Variant Inventory Qty",
  quantity: "Variant Inventory Qty",
  available: "Variant Inventory Qty",
  inventory: "Variant Inventory Qty",
  imageurl: "Image Src",
  image: "Image Src",
  "image src": "Image Src",
  imagelink: "Image Src",
  photo: "Image Src",
  color: "Option1 Value",
  colour: "Option1 Value",
  size: "Option2 Value",
};

export function buildAutoMapping(columns: string[]): Mapping {
  const mapping: Mapping = {};
  const assigned = new Set<ShopifyField>();
  for (const col of columns) {
    const normalized = col.toLowerCase().trim();
    const shopifyField = AUTO_MAP_SYNONYMS[normalized];
    if (shopifyField && !assigned.has(shopifyField)) {
      mapping[shopifyField] = col;
      assigned.add(shopifyField);
    }
  }
  return mapping;
}

// ---------------------------------------------------------------------------
// Diagnostic types
// ---------------------------------------------------------------------------

export interface DiagnosticIssue {
  code: string;
  rows: number[] | "global";
  msg: string;
  data?: {
    count?: number;
    headers?: Array<{ source: string; suggested: string | null }>;
    title?: string;
    correct_handle?: string;
    duplicate_titles?: string[];
    handle?: string;
    [key: string]: unknown;
  };
}

export interface DiagnosticSummary {
  totalRows: number;
  productCount: number;
  variantCount: number;
  errorsCount: number;
  warningsCount: number;
}

export interface DiffEntry {
  row: number;
  changeType: string;
  field: string;
  before: string;
  after: string;
  context: string;
}

export interface DiagnosticReport {
  summary: DiagnosticSummary;
  issues: DiagnosticIssue[];
  nonStandardHeaders: Array<{ source: string; suggested: string | null }>;
  handleFixes: Record<string, string>;
  diffPreview: DiffEntry[];
}

export interface RepairOptions {
  sanitizeEncoding: boolean;
  syncHandles: boolean;
  scrubPlaceholders: boolean;
  partitionFile: boolean;
}

export function buildRepairDefaults(report: DiagnosticReport): RepairOptions {
  const codes = new Set(report.issues.map((i) => i.code));
  return {
    sanitizeEncoding: codes.has("ERR_ILLEGAL_CHARACTERS") || codes.has("ERR_NON_UTF8"),
    syncHandles: codes.has("ERR_INCONSISTENT_HANDLE"),
    scrubPlaceholders: codes.has("ERR_DEFAULT_TITLE_CLASH"),
    partitionFile: report.summary.totalRows > 5000,
  };
}

// Merge diagnostic non-standard header suggestions into mapping
export function applyDiagnosticSuggestions(
  mapping: Mapping,
  nonStandardHeaders: Array<{ source: string; suggested: string | null }>
): Mapping {
  const next = { ...mapping };
  for (const { source, suggested } of nonStandardHeaders) {
    if (suggested && SHOPIFY_FIELDS.includes(suggested as ShopifyField) && !next[suggested]) {
      next[suggested] = source;
    }
  }
  return next;
}

// PreviewMeta (for variant detection in the output preview)
export interface PreviewMeta {
  hasDuplicateTitles: boolean;
  variantsWithSizeDetected: boolean;
  variantsWithoutSize: boolean;
  variantGroupsCount: number;
  variantRowsCount: number;
}
