import re
from collections import Counter, defaultdict
from io import BytesIO

import pandas as pd

SHOPIFY_STANDARD_HEADERS = {
    "Handle", "Title", "Body (HTML)", "Vendor", "Product Category",
    "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value",
    "Option2 Name", "Option2 Value",
    "Option3 Name", "Option3 Value",
    "Variant SKU", "Variant Grams", "Variant Inventory Tracker",
    "Variant Inventory Qty", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Variant Price",
    "Variant Compare At Price", "Variant Requires Shipping",
    "Variant Taxable", "Variant Barcode",
    "Image Src", "Image Position", "Image Alt Text",
    "Gift Card", "SEO Title", "SEO Description",
    "Variant Image", "Variant Weight Unit", "Variant Tax Code",
    "Cost per item", "Status",
}

# Non-standard column names → suggested Shopify field
NON_STANDARD_SUGGESTIONS: dict[str, str] = {
    # WooCommerce
    "post_title": "Title",
    "post_name": "Handle",
    "post_content": "Body (HTML)",
    "post_excerpt": "Body (HTML)",
    "regular_price": "Variant Price",
    "sale_price": "Variant Price",
    "_regular_price": "Variant Price",
    "_sale_price": "Variant Price",
    "sku": "Variant SKU",
    "_sku": "Variant SKU",
    "_stock": "Variant Inventory Qty",
    "stock_quantity": "Variant Inventory Qty",
    "Attribute 1 name": "Option1 Name",
    "Attribute 1 value(s)": "Option1 Value",
    "Attribute 2 name": "Option2 Name",
    "Attribute 2 value(s)": "Option2 Value",
    # Etsy
    "Listing title": "Title",
    "Listing description": "Body (HTML)",
    "Price": "Variant Price",
    "Quantity": "Variant Inventory Qty",
    # Generic / multi-platform
    "Color": "Option1 Value",
    "Colour": "Option1 Value",
    "Size": "Option1 Value",
    "Material": "Option2 Value",
    "name": "Title",
    "description": "Body (HTML)",
    "price": "Variant Price",
    "qty": "Variant Inventory Qty",
    "url_key": "Handle",
}

SMART_QUOTE_RE = re.compile("[\u201C\u201D\u2018\u2019\u00AB\u00BB]")
EMOJI_RE = re.compile(r"[\U00010000-\U0010FFFF]", flags=re.UNICODE)
CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

COLOR_TOKENS: dict[str, str] = {
    "RED": "Red", "BLUE": "Blue", "GREEN": "Green", "BLACK": "Black",
    "WHITE": "White", "YELLOW": "Yellow", "PINK": "Pink", "PURPLE": "Purple",
    "ORANGE": "Orange", "BROWN": "Brown", "GREY": "Grey", "GRAY": "Gray",
    "NAVY": "Navy", "BEIGE": "Beige", "TAN": "Tan", "TEAL": "Teal",
    "MAROON": "Maroon", "OLIVE": "Olive", "CORAL": "Coral", "CREAM": "Cream",
    "SILVER": "Silver", "GOLD": "Gold",
}
SIZE_SET = {"XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "36", "38", "40", "42", "44", "46"}


def _extract_color_size_from_sku(sku: str) -> tuple[str | None, str | None]:
    if not sku:
        return None, None
    parts = [p.upper() for p in re.split(r"[-_/ ]", sku.strip()) if p]
    color = next((COLOR_TOKENS[p] for p in parts if p in COLOR_TOKENS), None)
    size = next((p for p in parts if p in SIZE_SET), None)
    return color, size


def validate_csv(file_bytes: bytes) -> dict:
    issues: list[dict] = []

    bom = file_bytes.startswith(b"\xef\xbb\xbf")
    raw = file_bytes[3:] if bom else file_bytes

    # --- Encoding scan (pre-parse) ---
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        text = raw.decode("utf-8", errors="replace")
        issues.append({
            "code": "ERR_NON_UTF8",
            "rows": "global",
            "msg": "File contains non-UTF-8 characters that corrupt product data on import.",
        })

    smart_count = len(SMART_QUOTE_RE.findall(text))
    if smart_count:
        issues.append({
            "code": "ERR_ILLEGAL_CHARACTERS",
            "rows": "global",
            "msg": f"Found {smart_count} curly/smart quote characters. These break field values in Shopify.",
            "data": {"count": smart_count},
        })

    ctrl_count = len(CONTROL_CHAR_RE.findall(text))
    if ctrl_count:
        issues.append({
            "code": "WARN_CONTROL_CHARACTERS",
            "rows": "global",
            "msg": f"Found {ctrl_count} hidden control character(s) inside cells. These will be stripped.",
            "data": {"count": ctrl_count},
        })

    # --- Parse ---
    first_line = raw.split(b"\n")[0].decode("utf-8", errors="replace")
    sep = ";" if first_line.count(";") > first_line.count(",") else ","

    try:
        df = pd.read_csv(BytesIO(raw), dtype=str, sep=sep, keep_default_na=False)
    except Exception as exc:
        return _error_report(str(exc))

    df.columns = df.columns.str.strip()
    df = df.apply(lambda col: col.str.strip() if col.dtype == object else col)
    df = df.replace("", pd.NA).dropna(how="all").fillna("").reset_index(drop=True)

    headers = list(df.columns)
    total_rows = len(df)

    # Emoji in headers
    emoji_hdrs = [h for h in headers if EMOJI_RE.search(h)]
    if emoji_hdrs:
        issues.append({
            "code": "ERR_ILLEGAL_CHARACTERS",
            "rows": "global",
            "msg": f"Header(s) contain emoji: {', '.join(emoji_hdrs)}. Shopify rejects these on import.",
        })

    # --- Schema check ---
    non_standard: list[dict] = []
    for h in headers:
        if h not in SHOPIFY_STANDARD_HEADERS:
            suggestion = NON_STANDARD_SUGGESTIONS.get(h) or NON_STANDARD_SUGGESTIONS.get(h.lower())
            non_standard.append({"source": h, "suggested": suggestion})

    if non_standard:
        names = [ns["source"] for ns in non_standard]
        issues.append({
            "code": "WARN_NON_STANDARD_HEADERS",
            "rows": "global",
            "msg": (
                f"{len(non_standard)} column(s) not in Shopify schema: "
                f"{', '.join(names[:5])}{'…' if len(names) > 5 else ''}. Map them to Shopify fields below."
            ),
            "data": {"headers": non_standard},
        })

    # --- Product/variant checks ---
    has_handle = "Handle" in headers
    has_title = "Title" in headers

    handle_fixes: dict[str, str] = {}
    handle_groups: dict[str, list[int]] = defaultdict(list)
    title_for_handle: dict[str, str] = {}

    if has_title and has_handle:
        title_to_handles: dict[str, list[str]] = defaultdict(list)
        for idx, row in df.iterrows():
            t = row.get("Title", "")
            h = row.get("Handle", "")
            if t:
                title_to_handles[t].append(h)
            if h:
                handle_groups[h].append(int(idx))
                if t and h not in title_for_handle:
                    title_for_handle[h] = t

        for title, handles in title_to_handles.items():
            unique = list(dict.fromkeys(x for x in handles if x))
            if len(unique) > 1:
                correct = unique[0]
                bad_rows = [
                    int(i) + 2
                    for i, row in df.iterrows()
                    if row.get("Title") == title and row.get("Handle") != correct
                ]
                issues.append({
                    "code": "ERR_INCONSISTENT_HANDLE",
                    "rows": bad_rows,
                    "msg": f"'{title}' has {len(unique)} different handles ({', '.join(unique)}). All rows will use '{correct}'.",
                    "data": {"title": title, "correct_handle": correct},
                })
                handle_fixes[title] = correct

    elif has_title and not has_handle:
        title_counts = Counter(df["Title"].tolist())
        dup = [t for t, c in title_counts.items() if c > 1 and t]
        if dup:
            rows: list[int] = []
            for t in dup[:5]:
                rows.extend((df.index[df["Title"] == t] + 2).tolist())
            issues.append({
                "code": "ERR_DUPLICATE_TITLE_NO_HANDLE",
                "rows": rows[:20],
                "msg": f"{len(dup)} title(s) appear on multiple rows with no Handle column. Handles will be auto-generated.",
                "data": {"duplicate_titles": dup[:10]},
            })

    if has_handle:
        # Default Title clash
        if "Option1 Name" in headers and "Option1 Value" in headers:
            clash: list[int] = []
            for handle, idxs in handle_groups.items():
                if len(idxs) > 1:
                    for i in idxs:
                        o1n = df.at[i, "Option1 Name"]
                        o1v = df.at[i, "Option1 Value"]
                        if o1n == "Title" and o1v == "Default Title":
                            clash.append(i + 2)
            if clash:
                issues.append({
                    "code": "ERR_DEFAULT_TITLE_CLASH",
                    "rows": clash,
                    "msg": f"{len(clash)} row(s) carry the 'Default Title' placeholder inside multi-variant products. These rows will be removed.",
                })

        # Variant limit
        for handle, idxs in handle_groups.items():
            if len(idxs) > 100:
                label = title_for_handle.get(handle, handle)
                issues.append({
                    "code": "WARN_VARIANT_LIMIT_EXCEEDED",
                    "rows": [idxs[0] + 2],
                    "msg": f"'{label}' has {len(idxs)} variant rows — Shopify's hard limit is 100.",
                    "data": {"handle": handle, "count": len(idxs)},
                })

    # WooCommerce parent/child detection
    woo_indicators = {"post_type", "post_status", "tax:product_type", "meta:_product_type"}
    if woo_indicators & {h.lower() for h in headers}:
        issues.append({
            "code": "WARN_WOOCOMMERCE_FORMAT",
            "rows": "global",
            "msg": "WooCommerce export detected. Parent/variation rows will be re-linked using Handle inheritance.",
        })

    # SKU color/size intelligence
    if (
        "Variant SKU" in headers
        and "Option1 Name" not in headers
        and has_title
    ):
        sku_col = "Variant SKU"
        examples: list[dict] = []
        for _, row in df.head(20).iterrows():
            sku = row.get(sku_col, "")
            color, size = _extract_color_size_from_sku(sku)
            if color or size:
                examples.append({"sku": sku, "color": color, "size": size})
        if examples:
            issues.append({
                "code": "INFO_SKU_COLOR_INTELLIGENCE",
                "rows": "global",
                "msg": (
                    f"SKU codes appear to encode color and/or size (e.g. '{examples[0]['sku']}'). "
                    f"Shopify CSV Doctor can auto-generate Option1/Option2 columns from these SKUs."
                ),
                "data": {"examples": examples[:5]},
            })

    # File size / large file warning
    file_size_bytes = len(file_bytes)
    if file_size_bytes > 15_000_000:
        issues.append({
            "code": "WARN_LARGE_FILE",
            "rows": "global",
            "msg": f"File is {file_size_bytes / 1_000_000:.1f} MB. Shopify recommends files under 15 MB. Enable 'Split large file' in repairs to receive a .zip with multiple parts.",
            "data": {"bytes": file_size_bytes},
        })

    product_count = (
        len(handle_groups) if has_handle
        else (int(df["Title"].nunique()) if has_title else 0)
    )
    variant_count = max(0, total_rows - product_count)
    error_count = sum(1 for i in issues if i["code"].startswith("ERR"))
    warning_count = sum(1 for i in issues if i["code"].startswith("WARN"))

    return {
        "summary": {
            "totalRows": total_rows,
            "productCount": product_count,
            "variantCount": variant_count,
            "errorsCount": error_count,
            "warningsCount": warning_count,
        },
        "issues": issues,
        "nonStandardHeaders": non_standard,
        "handleFixes": handle_fixes,
        "diffPreview": _build_diff_preview(df, handle_fixes),
    }


def _error_report(msg: str) -> dict:
    return {
        "summary": {"totalRows": 0, "productCount": 0, "variantCount": 0, "errorsCount": 1, "warningsCount": 0},
        "issues": [{"code": "ERR_PARSE_FAILED", "rows": "global", "msg": msg}],
        "nonStandardHeaders": [],
        "handleFixes": {},
        "diffPreview": [],
    }


def _build_diff_preview(df: pd.DataFrame, handle_fixes: dict[str, str]) -> list[dict]:
    if not handle_fixes or "Title" not in df.columns or "Handle" not in df.columns:
        return []
    preview: list[dict] = []
    for title, correct in list(handle_fixes.items())[:3]:
        for idx, row in df[df["Title"] == title].iterrows():
            current = row.get("Handle", "")
            if current != correct:
                preview.append({
                    "row": int(idx) + 2,
                    "changeType": "ERR_INCONSISTENT_HANDLE",
                    "field": "Handle",
                    "before": current,
                    "after": correct,
                    "context": title,
                })
                if len(preview) >= 8:
                    return preview
    return preview
