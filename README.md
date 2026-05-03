# Shopify CSV Fixer

Upload a supplier CSV, map columns to Shopify product fields, download a Shopify-ready CSV.

## Requirements

- Python 3.10+
- Node.js 18+

## Quick Start

### 1. Run the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API runs at http://localhost:8000  
Interactive docs at http://localhost:8000/docs

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173

---

## Example Workflow

1. Open http://localhost:5173
2. Upload `samples/sample_supplier.csv`
3. Map the columns:

   | Shopify Field | Supplier Column |
   |---|---|
   | Title | ProductName |
   | Variant SKU | SKU |
   | Variant Price | Price |
   | Variant Inventory Qty | Stock |
   | Image Src | ImageURL |

4. Click **Generate Shopify CSV**
5. `shopify_ready.csv` downloads automatically

The output matches `samples/expected_shopify_output.csv`.

---

## API Reference

| Endpoint | Method | Body | Response |
|---|---|---|---|
| `/api/preview` | POST | `file` (CSV, multipart) | `{ columns, rows }` |
| `/api/transform` | POST | `file` (CSV) + `mapping` (JSON string) | `text/csv` download |
| `/docs` | GET | — | Swagger UI |

## Normalization

The backend automatically:
- Converts comma decimals to dot decimals (`19,99` → `19.99`)
- Strips currency symbols from prices (`€39.99` → `39.99`)
- Converts stock to integer; blank/invalid → `0`
- Generates `Handle` from `Title` via slugify (if Handle not mapped)
- Defaults `Published` to `TRUE`, `Option1 Name` to `Title`, `Option1 Value` to `Default Title`
- Outputs UTF-8 encoded CSV

## Project Structure

```
backend/              FastAPI + pandas
frontend/             React + TypeScript + Vite + TailwindCSS
samples/              Example input and expected output CSVs
BACKLOG.md            Product backlog
CLAUDE.md             Developer guidance for Claude Code
```
