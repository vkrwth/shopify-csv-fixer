import re
import unicodedata
from collections import Counter
from io import BytesIO

import pandas as pd

SHOPIFY_FIELDS = [
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
]

SIZE_TOKENS = {
    "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL",
    "36", "38", "40", "42", "44", "46",
}


def slugify(text: str) -> str:
    s = unicodedata.normalize("NFKD", str(text))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")


def extract_size_from_sku(sku: str) -> str | None:
    if not sku:
        return None
    tokens = re.split(r"[-_/ ]", sku.strip())
    last = tokens[-1].upper() if tokens else ""
    return last if last in SIZE_TOKENS else None


def normalize_price(value: object) -> str:
    if pd.isna(value) or str(value).strip() == "":
        return ""
    s = str(value).strip()
    s = s.replace("€", "").replace("$", "").replace("£", "").strip()
    # European format: thousands dot + comma decimal — e.g. 1.999,99
    if re.match(r"^\d{1,3}(\.\d{3})+,\d{2}$", s):
        s = s.replace(".", "").replace(",", ".")
    # Simple comma-decimal: 19,99
    elif re.match(r"^\d+,\d{2}$", s):
        s = s.replace(",", ".")
    else:
        s = s.replace(",", "")
    try:
        return f"{float(s):.2f}"
    except (ValueError, TypeError):
        return ""


def normalize_qty(value: object) -> int:
    if pd.isna(value) or str(value).strip() == "":
        return 0
    s = str(value).strip().replace(",", "")
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return 0


def _read_csv(file_bytes: bytes) -> pd.DataFrame:
    if file_bytes.startswith(b"\xef\xbb\xbf"):
        file_bytes = file_bytes[3:]

    first_line = file_bytes.split(b"\n")[0].decode("utf-8", errors="replace")
    sep = ";" if first_line.count(";") > first_line.count(",") else ","

    df = pd.read_csv(BytesIO(file_bytes), dtype=str, sep=sep)
    df = df.fillna("")
    df.columns = df.columns.str.strip()
    df = df.apply(lambda col: col.str.strip() if col.dtype == object else col)
    return df


def preview_csv(file_bytes: bytes) -> dict:
    df = _read_csv(file_bytes)
    return {
        "columns": list(df.columns),
        "rows": df.head(5).to_dict(orient="records"),
    }


def transform_csv(file_bytes: bytes, mapping: dict[str, str]) -> bytes:
    df = _read_csv(file_bytes)

    user_maps_opt1_name = bool(mapping.get("Option1 Name"))
    user_maps_opt1_value = bool(mapping.get("Option1 Value"))

    # First pass: extract mapped fields for every row
    raw_rows: list[dict[str, object]] = []
    for _, row in df.iterrows():
        out: dict[str, object] = {}
        for field in SHOPIFY_FIELDS:
            supplier_col = mapping.get(field, "")
            out[field] = row[supplier_col] if supplier_col and supplier_col in df.columns else ""
        raw_rows.append(out)

    # Identify titles that appear more than once — these are variant groups
    title_counts = Counter(str(r["Title"]) for r in raw_rows if r["Title"])
    duplicate_titles = {t for t, c in title_counts.items() if c > 1}

    out_rows = []
    for out in raw_rows:
        if not out["Handle"] and out["Title"]:
            out["Handle"] = slugify(str(out["Title"]))

        if not out["Published"]:
            out["Published"] = "TRUE"

        # Variant option logic
        is_variant = str(out["Title"]) in duplicate_titles

        if is_variant and not user_maps_opt1_name and not user_maps_opt1_value:
            size = extract_size_from_sku(str(out["Variant SKU"]))
            if size:
                out["Option1 Name"] = "Size"
                out["Option1 Value"] = size

        # Fallback defaults (non-variant rows, or variants where size wasn't detected)
        if not out["Option1 Name"]:
            out["Option1 Name"] = "Title"
        if not out["Option1 Value"]:
            out["Option1 Value"] = "Default Title"

        out["Variant Price"] = normalize_price(out["Variant Price"])
        out["Variant Inventory Qty"] = normalize_qty(out["Variant Inventory Qty"])

        out_rows.append(out)

    out_df = pd.DataFrame(out_rows, columns=SHOPIFY_FIELDS)
    buf = BytesIO()
    out_df.to_csv(buf, index=False, encoding="utf-8")
    return buf.getvalue()
