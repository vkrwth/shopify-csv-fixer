# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Shopify CSV Fixer** — an MVP web app that lets users upload a supplier CSV, map supplier columns to Shopify product fields, and download a ready-to-import Shopify CSV. Stateless, no auth, no database. All processing happens per-request.

## Architecture

```
shopifyMapper/
├── backend/           # FastAPI + Python + pandas
│   ├── main.py        # App entry point, CORS, route definitions
│   ├── models/schemas.py       # Pydantic response models
│   └── services/csv_transformer.py  # All CSV logic (parse, normalize, transform)
├── frontend/          # React + TypeScript + Vite + TailwindCSS
│   └── src/
│       ├── App.tsx          # Single-page state machine: upload → mapping → download
│       ├── types/index.ts   # Shared types + SHOPIFY_FIELDS constant + field metadata
│       ├── api/client.ts    # Fetch wrappers for /api/preview and /api/transform
│       └── components/
│           ├── CsvUpload.tsx    # Drag-and-drop file input
│           ├── CsvPreview.tsx   # Preview table (first 5 rows)
│           └── MappingTable.tsx # Shopify field → supplier column dropdowns
└── samples/
    ├── sample_supplier.csv           # Test input
    └── expected_shopify_output.csv   # Expected output after standard mapping
```

## Commands

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev          # dev server → http://localhost:5173
npm run build        # production build (runs tsc first)
npm run typecheck    # type-check only, no emit
```

## Vite Proxy

`vite.config.ts` proxies `/api/*` → `http://localhost:8000`. Never hardcode the API base URL in frontend code — always use relative `/api/...` paths.

## Data Flow

1. `POST /api/preview` — multipart form with `file` field → returns `{ columns: string[], rows: object[] }`
2. `POST /api/transform` — multipart form with `file` field + `mapping` field (JSON string) → returns `text/csv` blob named `shopify_ready.csv`

The mapping shape: `{ "Shopify Field Name": "supplier_column_name" }`. Empty string value = unmapped.

The uploaded file is NOT stored server-side. The frontend re-uploads the original file on transform, keeping the backend fully stateless.

## Shopify Field Normalization (csv_transformer.py)

All logic lives in `services/csv_transformer.py`. Rules applied per-row during transform:

| Field | Rule |
|---|---|
| `Handle` | Auto-slugified from Title if not mapped |
| `Published` | Defaults to `TRUE` if unmapped |
| `Option1 Name` | Defaults to `Title` if blank |
| `Option1 Value` | Defaults to `Default Title` if blank |
| `Variant Price` | Strip €/$, convert comma-decimal (19,99→19.99), format to 2dp |
| `Variant Inventory Qty` | Cast to int; blank/invalid → 0 |

## Frontend Validation Rules (MappingTable.tsx + App.tsx)

- **Title**: required — Generate button is disabled until Title is mapped
- **Variant SKU**, **Variant Price**: recommended — show warning badge if unmapped
- All 15 Shopify fields are shown; unmapped fields output as empty columns

## Backlog

See `BACKLOG.md` for the full product backlog and ticket status.
