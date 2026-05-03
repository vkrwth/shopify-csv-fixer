# Shopify CSV Fixer — Product Backlog

## MVP Scope

### Epic: Core CSV Mapping Flow

| ID | Story | Status |
|---|---|---|
| T-1 | Project scaffolding — backend + frontend directory structure, config files | ✅ Done |
| T-2 | `POST /api/preview` — parse uploaded CSV, return columns + first 5 rows | ✅ Done |
| T-3 | `POST /api/transform` — accept CSV + mapping JSON, return transformed Shopify CSV | ✅ Done |
| T-4 | CSV transformer service — apply all normalization rules (price, qty, handle, defaults) | ✅ Done |
| T-5 | `CsvUpload` component — drag-and-drop or click-to-browse CSV upload | ✅ Done |
| T-6 | `CsvPreview` component — display first 5 rows in a scrollable table | ✅ Done |
| T-7 | `MappingTable` component — one dropdown per Shopify field mapped to supplier columns | ✅ Done |
| T-8 | Generate & download flow — POST transform, auto-download `shopify_ready.csv` | ✅ Done |
| T-9 | Field validation — Title required (button disabled), SKU + Price recommended (warnings) | ✅ Done |
| T-10 | Sample files — `sample_supplier.csv` + `expected_shopify_output.csv` | ✅ Done |
| T-11 | README with setup instructions and example workflow | ✅ Done |
| T-12 | CLAUDE.md developer guide | ✅ Done |

---

## Post-MVP Backlog

### UX Improvements

| ID | Story | Priority |
|---|---|---|
| T-20 | Auto-suggest column mapping by fuzzy name match (e.g. "ProductName" → Title) | High |
| T-21 | Save and load mapping presets as JSON | Medium |
| T-22 | Show row count and file size after upload | Low |
| T-23 | Progress bar for large CSV files | Low |
| T-24 | Warn when the same supplier column is mapped to multiple Shopify fields | Medium |
| T-25 | "Reset mapping" button | Low |

### Data / Transform

| ID | Story | Priority |
|---|---|---|
| T-30 | Advanced variant grouping — combine rows with same Title into one product + variant rows | High |
| T-31 | Support Excel (.xlsx) input via openpyxl | Medium |
| T-32 | Support semicolon-delimited CSV (common in EU exports) | Medium |
| T-33 | Custom value transformations per field (e.g. uppercase Vendor) | Low |
| T-34 | Metafield columns passthrough | Low |
| T-35 | Configurable default values for Published, Option1 Name, Option1 Value | Low |

### Quality

| ID | Story | Priority |
|---|---|---|
| T-40 | Backend unit tests (pytest) — csv_transformer normalization functions | High |
| T-41 | Backend integration tests — /api/preview and /api/transform endpoints | Medium |
| T-42 | Frontend component tests (vitest + testing-library) — MappingTable, CsvUpload | Medium |
| T-43 | CI pipeline (GitHub Actions) — run backend tests + frontend typecheck on PR | Medium |

### Infrastructure

| ID | Story | Priority |
|---|---|---|
| T-50 | Docker Compose for one-command local startup | Low |
| T-51 | Deployment config (e.g. Railway/Render for backend, Vercel for frontend) | Low |
