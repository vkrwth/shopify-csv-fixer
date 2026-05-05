import re
import unicodedata
import zipfile
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

SMART_QUOTE_RE = re.compile("[\u201C\u201D\u2018\u2019\u00AB\u00BB]")
EMOJI_RE = re.compile(r"[\U00010000-\U0010FFFF]", flags=re.UNICODE)
LINEBREAK_RE = re.compile(r"[\r\n]+")
CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


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
    if re.match(r"^\d{1,3}(\.\d{3})+,\d{2}$", s):
        s = s.replace(".", "").replace(",", ".")
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


# ---------------------------------------------------------------------------
# Repair functions
# ---------------------------------------------------------------------------

def sanitize_encoding_df(df: pd.DataFrame) -> pd.DataFrame:
    """Replace smart quotes, strip control chars and line breaks inside cells."""
    def clean(val: str) -> str:
        val = SMART_QUOTE_RE.sub('"', val)
        val = LINEBREAK_RE.sub(" ", val)
        val = CONTROL_CHAR_RE.sub("", val)
        return val

    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].apply(clean)

    if "Handle" in df.columns:
        df["Handle"] = df["Handle"].apply(lambda v: EMOJI_RE.sub("", v).strip("-"))

    return df


def sync_handles_df(df: pd.DataFrame) -> pd.DataFrame:
    """Overwrite all handles in a Title group with the first row's handle."""
    if "Title" not in df.columns or "Handle" not in df.columns:
        return df

    title_to_handle: dict[str, str] = {}
    for _, row in df.iterrows():
        t = row.get("Title", "")
        h = row.get("Handle", "")
        if t and h and t not in title_to_handle:
            title_to_handle[t] = h

    def fix(row: pd.Series) -> str:
        t = row.get("Title", "")
        return title_to_handle.get(t, row.get("Handle", ""))

    df["Handle"] = df.apply(fix, axis=1)
    return df


def scrub_placeholders_df(df: pd.DataFrame) -> pd.DataFrame:
    """Remove rows with 'Default Title' in multi-variant products."""
    if "Handle" not in df.columns or "Option1 Value" not in df.columns:
        return df

    handle_counts = df["Handle"].value_counts()
    multi = set(handle_counts[handle_counts > 1].index)

    def is_placeholder(row: pd.Series) -> bool:
        return (
            row.get("Handle", "") in multi
            and row.get("Option1 Value", "") == "Default Title"
            and row.get("Option1 Name", "") in ("", "Title")
        )

    mask = df.apply(is_placeholder, axis=1)
    return df[~mask].reset_index(drop=True)


def _partition_by_product(df: pd.DataFrame, max_rows: int = 5000) -> list[pd.DataFrame]:
    if len(df) <= max_rows or "Handle" not in df.columns:
        return [df]

    parts: list[pd.DataFrame] = []
    current: list[pd.DataFrame] = []
    current_count = 0

    for _, group in df.groupby("Handle", sort=False):
        gs = len(group)
        if current_count + gs > max_rows and current:
            parts.append(pd.concat(current, ignore_index=True))
            current = []
            current_count = 0
        current.append(group)
        current_count += gs

    if current:
        parts.append(pd.concat(current, ignore_index=True))

    return parts or [df]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def preview_csv(file_bytes: bytes) -> dict:
    df = _read_csv(file_bytes)
    return {
        "columns": list(df.columns),
        "rows": df.head(5).to_dict(orient="records"),
    }


def transform_csv(
    file_bytes: bytes,
    mapping: dict[str, str],
    repair_options: dict[str, bool] | None = None,
) -> tuple[bytes, str]:
    """
    Returns (content_bytes, filename).
    filename ends with .zip when the file is partitioned.
    """
    opts = repair_options or {}
    df = _read_csv(file_bytes)

    # Drop completely empty rows
    df = df.replace("", pd.NA).dropna(how="all").fillna("").reset_index(drop=True)

    # Repair pass 1: encoding (operates on source df, before column selection)
    if opts.get("sanitizeEncoding", False):
        df = sanitize_encoding_df(df)

    # Repair pass 2: sync inconsistent handles
    if opts.get("syncHandles", False):
        df = sync_handles_df(df)

    user_maps_opt1_name = bool(mapping.get("Option1 Name"))
    user_maps_opt1_value = bool(mapping.get("Option1 Value"))

    # Build mapped rows
    raw_rows: list[dict[str, object]] = []
    for _, row in df.iterrows():
        out: dict[str, object] = {}
        for field in SHOPIFY_FIELDS:
            supplier_col = mapping.get(field, "")
            out[field] = row[supplier_col] if supplier_col and supplier_col in df.columns else ""
        raw_rows.append(out)

    # Identify variant groups (titles with >1 row)
    title_counts = Counter(str(r["Title"]) for r in raw_rows if r["Title"])
    duplicate_titles = {t for t, c in title_counts.items() if c > 1}

    out_rows = []
    for out in raw_rows:
        if not out["Handle"] and out["Title"]:
            out["Handle"] = slugify(str(out["Title"]))

        if not out["Published"]:
            out["Published"] = "TRUE"

        is_variant = str(out["Title"]) in duplicate_titles

        if is_variant and not user_maps_opt1_name and not user_maps_opt1_value:
            size = extract_size_from_sku(str(out["Variant SKU"]))
            if size:
                out["Option1 Name"] = "Size"
                out["Option1 Value"] = size

        if not out["Option1 Name"]:
            out["Option1 Name"] = "Title"
        if not out["Option1 Value"]:
            out["Option1 Value"] = "Default Title"

        out["Variant Price"] = normalize_price(out["Variant Price"])
        out["Variant Inventory Qty"] = normalize_qty(out["Variant Inventory Qty"])

        out_rows.append(out)

    out_df = pd.DataFrame(out_rows, columns=SHOPIFY_FIELDS)

    # Repair pass 3: scrub Default Title placeholders (on mapped output)
    if opts.get("scrubPlaceholders", False):
        out_df = scrub_placeholders_df(out_df)

    # Decide output format
    total_rows = len(out_df)
    file_bytes_estimate = total_rows * 200  # rough bytes per row

    should_partition = opts.get("partitionFile", False) or total_rows > 5000 or file_bytes_estimate > 15_000_000

    if should_partition:
        parts = _partition_by_product(out_df)
        if len(parts) > 1:
            buf = BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for i, part in enumerate(parts, 1):
                    csv_buf = BytesIO()
                    part.to_csv(csv_buf, index=False, encoding="utf-8-sig")
                    zf.writestr(f"shopify_ready_part{i}.csv", csv_buf.getvalue())
            return buf.getvalue(), "shopify_ready.zip"

    csv_buf = BytesIO()
    out_df.to_csv(csv_buf, index=False, encoding="utf-8-sig")
    return csv_buf.getvalue(), "shopify_ready.csv"
