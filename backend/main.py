import json
import os
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models.schemas import DiagnosticReport, PreviewResponse
from services.csv_transformer import preview_csv, transform_csv
from services.csv_validator import validate_csv

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


@app.post("/api/validate", response_model=DiagnosticReport)
async def validate(file: UploadFile = File(...)):
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")
    content = await file.read()
    try:
        result = validate_csv(content)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Validation failed: {exc}") from exc
    return result


@app.post("/api/transform")
async def transform(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    repairs: str = Form(default="{}"),
):
    content = await file.read()
    try:
        mapping_dict: dict[str, str] = json.loads(mapping)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid mapping JSON") from exc
    try:
        repair_options: dict[str, bool] = json.loads(repairs)
    except Exception:
        repair_options = {}
    try:
        csv_bytes, filename = transform_csv(content, mapping_dict, repair_options)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Transform failed: {exc}") from exc

    media_type = "application/zip" if filename.endswith(".zip") else "text/csv"
    return StreamingResponse(
        BytesIO(csv_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
