# Shopify CSV Fixer

Upload a supplier CSV, map columns to Shopify product fields, download a Shopify-ready file.

**Live app:** https://shopify-csv-fixer-sand.vercel.app  
**API:** https://shopify-fixer.duckdns.org

---

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API at http://localhost:8000 — Swagger UI at http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App at http://localhost:5173. The Vite dev server proxies `/api/*` to `localhost:8000` automatically — no env var needed locally.

### Environment variables (local)

Create `frontend/.env.local`:

```
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://eu.i.posthog.com
# VITE_API_BASE_URL is intentionally blank — Vite proxy handles it locally
```

---

## Production Architecture

```
Browser
  │
  ├── Frontend (Vercel)
  │     shopify-csv-fixer-sand.vercel.app
  │     Built with Vite, deployed via Vercel CLI
  │
  └── Backend (Hetzner VPS, Docker)
        shopify-fixer.duckdns.org → nginx → Docker container :8001
```

---

## Deployment

### Backend — Hetzner VPS

The backend runs as a Docker container behind nginx with SSL.

**First-time setup (already done):**

```bash
# On the server
git clone git@github.com:vkrwth/shopify-csv-fixer.git /home/csvfixer/shopify-csv-fixer
cd /home/csvfixer/shopify-csv-fixer/backend

docker build -t shopify-backend .
docker run -d \
  --name shopify-backend \
  --restart unless-stopped \
  -p 8001:8000 \
  -e ALLOWED_ORIGINS=https://shopify-csv-fixer-sand.vercel.app \
  shopify-backend
```

**nginx config** at `/etc/nginx/sites-available/shopify-csv-api`:

```nginx
server {
    server_name shopify-fixer.duckdns.org;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

SSL managed by Certbot:
```bash
certbot --nginx -d shopify-fixer.duckdns.org --preferred-challenges http
```

**To deploy a backend update:**

```bash
cd /home/csvfixer/shopify-csv-fixer
git pull
cd backend
docker build -t shopify-backend .
docker stop shopify-backend && docker rm shopify-backend
docker run -d \
  --name shopify-backend \
  --restart unless-stopped \
  -p 8001:8000 \
  -e ALLOWED_ORIGINS=https://shopify-csv-fixer-sand.vercel.app \
  shopify-backend
```

---

### Frontend — Vercel

**Vercel environment variables** (set in dashboard → Settings → Environment Variables):

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://shopify-fixer.duckdns.org` |
| `VITE_POSTHOG_KEY` | `phc_...` |
| `VITE_POSTHOG_HOST` | `https://eu.i.posthog.com` |

**To deploy a frontend update:**

```bash
cd frontend
vercel --prod
```

Or push to `master` if you set up Vercel's GitHub integration.

---

## Analytics (PostHog)

Events tracked through the user funnel:

| Event | Trigger | Properties |
|---|---|---|
| `page_view` | App load | — |
| `upload_started` | File selected or dropped | — |
| `upload_parsed` | Preview API responds | `number_of_columns`, `preview_rows` |
| `generate_clicked` | Generate button pressed | `mapped_fields_count`, `has_title_mapping`, `has_sku_mapping`, `has_price_mapping` |
| `variants_detected` | Duplicate titles found | `variant_groups_count`, `variant_rows_count`, `detection_method` |
| `download_completed` | CSV downloaded | `has_variants`, `mapped_fields_count` |

**View stats:** https://eu.posthog.com — log in and open the project dashboard.

No personal data, file contents, or product names are sent to PostHog.

---

## API Reference

| Endpoint | Method | Body | Response |
|---|---|---|---|
| `POST /api/preview` | POST | `file` (CSV, multipart) | `{ columns: string[], rows: object[] }` |
| `POST /api/transform` | POST | `file` (CSV) + `mapping` (JSON string) | `text/csv` download |
| `GET /docs` | GET | — | Swagger UI |

**Mapping shape:** `{ "Shopify Field Name": "supplier_column_name" }`. Empty string = unmapped.

---

## What the backend normalises automatically

| Field | Rule |
|---|---|
| `Handle` | Slugified from Title if not mapped; accents stripped |
| `Published` | Defaults to `TRUE` |
| `Option1 Name` / `Option1 Value` | `Size` / detected size for variant rows; `Title` / `Default Title` otherwise |
| `Variant Price` | Strips `€$£`, handles `19,99` and `1.999,99` formats |
| `Variant Inventory Qty` | Casts to int; `Out of stock`, blank → `0` |
| Delimiter | Auto-detects `,` vs `;` (European Excel) |
| Encoding | Strips UTF-8 BOM from Excel exports |
| Whitespace | Strips leading/trailing spaces from headers and cells |

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
python tests/test_edge_cases.py
```

125 checks covering price formats, stock formats, special characters, multilingual input, variant detection, BOM handling, semicolon-delimited files, and more.

---

## Project Structure

```
backend/
  main.py                    FastAPI app, CORS, routes
  services/csv_transformer.py  All CSV logic
  models/schemas.py          Pydantic response models
  tests/test_edge_cases.py   125-check test suite
  Dockerfile
frontend/
  src/
    App.tsx                  Single-page state machine
    api/client.ts            fetch wrappers
    components/              UI components
    lib/posthog.ts           Analytics helper
    utils/preview.ts         Client-side CSV preview logic
    types/index.ts           Shopify fields + auto-mapping
  vercel.json
samples/
  sample_supplier.csv
  expected_shopify_output.csv
  edge-cases/                11 edge-case CSVs for testing
```
