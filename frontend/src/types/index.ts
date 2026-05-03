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

// Normalized supplier column name → Shopify field (first match wins per field)
const AUTO_MAP_SYNONYMS: Record<string, ShopifyField> = {
  // Title
  productname: "Title",
  "product name": "Title",
  name: "Title",
  product: "Title",
  "item name": "Title",
  // Body (HTML)
  description: "Body (HTML)",
  productdescription: "Body (HTML)",
  body: "Body (HTML)",
  "long description": "Body (HTML)",
  // Vendor
  brand: "Vendor",
  vendor: "Vendor",
  manufacturer: "Vendor",
  supplier: "Vendor",
  // Type
  category: "Type",
  "product type": "Type",
  type: "Type",
  // Tags
  tags: "Tags",
  keywords: "Tags",
  // Variant SKU
  sku: "Variant SKU",
  articlenumber: "Variant SKU",
  itemcode: "Variant SKU",
  productcode: "Variant SKU",
  // Variant Price
  price: "Variant Price",
  retailprice: "Variant Price",
  saleprice: "Variant Price",
  unitprice: "Variant Price",
  // Variant Inventory Qty
  stock: "Variant Inventory Qty",
  qty: "Variant Inventory Qty",
  quantity: "Variant Inventory Qty",
  available: "Variant Inventory Qty",
  inventory: "Variant Inventory Qty",
  // Image Src
  imageurl: "Image Src",
  image: "Image Src",
  "image src": "Image Src",
  imagelink: "Image Src",
  photo: "Image Src",
  // Options
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
