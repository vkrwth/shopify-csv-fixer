import json
import os
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models.schemas import PreviewResponse
from services.csv_transformer import preview_csv, transform_csv

app = FastAPI(title="Shopify CSV Fixer API")

_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
_origins = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/preview", response_model=PreviewResponse)
async def preview(file: UploadFile = File(...)):
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")
    content = await file.read()
    try:
        result = preview_csv(content)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {exc}") from exc
    return result


@app.post("/api/transform")
async def transform(
    file: UploadFile = File(...),
    mapping: str = Form(...),
):
    content = await file.read()
    try:
        mapping_dict: dict[str, str] = json.loads(mapping)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid mapping JSON") from exc
    try:
        csv_bytes = transform_csv(content, mapping_dict)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Transform failed: {exc}") from exc
    return StreamingResponse(
        BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=shopify_ready.csv"},
    )
