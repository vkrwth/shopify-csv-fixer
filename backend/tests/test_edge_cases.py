"""Edge case tests for csv_transformer."""
import csv
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.csv_transformer import (
    extract_size_from_sku,
    normalize_price,
    normalize_qty,
    preview_csv,
    slugify,
    transform_csv,
)

SAMPLES = Path(__file__).parent.parent.parent / "samples" / "edge-cases"

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

_failures = []


def check(label: str, got, expected):
    ok = got == expected
    status = PASS if ok else FAIL
    print(f"  [{status}] {label}")
    if not ok:
        print(f"         got={got!r}  expected={expected!r}")
        _failures.append(label)


# ---------------------------------------------------------------------------
# Unit: normalize_price
# ---------------------------------------------------------------------------
print("\n=== normalize_price ===")
check("dot decimal",           normalize_price("19.99"),      "19.99")
check("comma decimal",         normalize_price("19,99"),      "19.99")
check("euro comma decimal",    normalize_price("€49,95"),     "49.95")
check("euro dot decimal",      normalize_price("€39.99"),     "39.99")
check("euro with space",       normalize_price("€ 89.00"),    "89.00")
check("dollar sign",           normalize_price("$24.99"),     "24.99")
check("pound sign",            normalize_price("£14.99"),     "14.99")
check("European thousands",    normalize_price("1.999,99"),   "1999.99")
check("large EUR thousands",   normalize_price("10.500,00"),  "10500.00")
check("US thousands comma",    normalize_price("1,999.99"),   "1999.99")
check("FREE",                  normalize_price("FREE"),       "")
check("N/A",                   normalize_price("N/A"),        "")
check("empty string",          normalize_price(""),           "")
check("negative price",        normalize_price("-5.00"),      "-5.00")
check("zero",                  normalize_price("0.00"),       "0.00")
check("whole number",          normalize_price("25"),         "25.00")
check("euro no decimal",       normalize_price("€30"),        "30.00")

# ---------------------------------------------------------------------------
# Unit: normalize_qty
# ---------------------------------------------------------------------------
print("\n=== normalize_qty ===")
check("integer",            normalize_qty("500"),         500)
check("decimal",            normalize_qty("12.5"),        12)
check("comma thousands",    normalize_qty("1,000"),       1000)
check("large comma",        normalize_qty("10,000"),      10000)
check("zero",               normalize_qty("0"),           0)
check("negative",           normalize_qty("-3"),          -3)
check("empty",              normalize_qty(""),            0)
check("Out of stock",       normalize_qty("Out of stock"), 0)
check("N/A",                normalize_qty("N/A"),         0)
check("float round",        normalize_qty("99.9"),        99)

# ---------------------------------------------------------------------------
# Unit: slugify
# ---------------------------------------------------------------------------
print("\n=== slugify ===")
check("basic",              slugify("Blue T-Shirt"),          "blue-t-shirt")
check("accents",            slugify("Café Racer Jacket!"),    "cafe-racer-jacket")
check("umlaut",             slugify("Größe XL Hoodie"),       "große-xl-hoodie")  # ö → o, ß stays (not a combining char)
check("nordic",             slugify("Björk Edition Tee"),     "bjork-edition-tee")
check("tilde n",            slugify("Ñoño Artisan Soap"),     "nono-artisan-soap")
check("spaces collapse",    slugify("  multiple   spaces  "), "multiple-spaces")
check("underscores",        slugify("under_score_name"),      "under-score-name")
check("trailing dash",      slugify("-leading-trailing-"),    "leading-trailing")
check("special chars",      slugify("Price: $19.99!"),        "price-1999")
check("cyrillic passthru",  len(slugify("Кожаная куртка")) > 0, True)


# ---------------------------------------------------------------------------
# Integration: preview_csv handles BOM, semicolons, whitespace headers
# ---------------------------------------------------------------------------
print("\n=== preview_csv: euro_semicolon.csv ===")
data = (SAMPLES / "euro_semicolon.csv").read_bytes()
result = preview_csv(data)
check("semicolon: column count", len(result["columns"]), 6)
check("semicolon: first col name", result["columns"][0], "ProductName")
check("semicolon: row count", len(result["rows"]), 5)

print("\n=== preview_csv: whitespace_padding.csv ===")
data = (SAMPLES / "whitespace_padding.csv").read_bytes()
result = preview_csv(data)
check("whitespace: first col stripped", result["columns"][0], "ProductName")
check("whitespace: no leading space in col", " ProductName" not in result["columns"], True)

print("\n=== preview_csv: UTF-8 BOM ===")
bom_csv = b"\xef\xbb\xbfProductName,SKU,Price\nBlue Shirt,SKU-001,19.99\n"
result = preview_csv(bom_csv)
check("BOM: first column is clean", result["columns"][0], "ProductName")
check("BOM: not corrupted", result["columns"][0] != "﻿ProductName", True)

print("\n=== preview_csv: no_data_rows.csv ===")
data = (SAMPLES / "no_data_rows.csv").read_bytes()
result = preview_csv(data)
check("no data: columns present", len(result["columns"]) > 0, True)
check("no data: rows empty", len(result["rows"]), 0)


# ---------------------------------------------------------------------------
# Integration: transform_csv — price_formats.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: price_formats.csv ===")
data = (SAMPLES / "price_formats.csv").read_bytes()
mapping = {"Title": "ProductName", "Variant SKU": "SKU", "Variant Price": "Price"}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)

price_map = {r["Variant SKU"]: r["Variant Price"] for r in rows}
check("price: dot decimal",        price_map.get("SKU-001"), "19.99")
check("price: comma decimal",      price_map.get("SKU-002"), "19.99")
check("price: euro comma",         price_map.get("SKU-003"), "49.95")
check("price: euro dot",           price_map.get("SKU-004"), "39.99")
check("price: euro space",         price_map.get("SKU-005"), "89.00")
check("price: dollar",             price_map.get("SKU-006"), "24.99")
check("price: pound",              price_map.get("SKU-007"), "14.99")
check("price: EUR thousands",      price_map.get("SKU-008"), "1999.99")
check("price: large EUR thousands",price_map.get("SKU-009"), "10500.00")
check("price: US thousands",       price_map.get("SKU-010"), "1999.99")
check("price: FREE → empty",       price_map.get("SKU-011"), "")
check("price: N/A → empty",        price_map.get("SKU-012"), "")
check("price: empty → empty",      price_map.get("SKU-013"), "")
check("price: whole number",       price_map.get("SKU-017"), "25.00")
check("price: euro no decimal",    price_map.get("SKU-018"), "30.00")


# ---------------------------------------------------------------------------
# Integration: transform_csv — stock_formats.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: stock_formats.csv ===")
data = (SAMPLES / "stock_formats.csv").read_bytes()
mapping = {
    "Title": "ProductName", "Variant SKU": "SKU",
    "Variant Price": "Price", "Variant Inventory Qty": "Stock",
}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)

qty_map = {r["Variant SKU"]: r["Variant Inventory Qty"] for r in rows}
check("qty: integer",          qty_map.get("SKU-001"), "500")
check("qty: decimal truncated",qty_map.get("SKU-002"), "12")
check("qty: comma thousands",  qty_map.get("SKU-003"), "1000")
check("qty: large comma",      qty_map.get("SKU-004"), "10000")
check("qty: out of stock text",qty_map.get("SKU-005"), "0")
check("qty: zero",             qty_map.get("SKU-007"), "0")
check("qty: empty",            qty_map.get("SKU-009"), "0")
check("qty: N/A",              qty_map.get("SKU-012"), "0")


# ---------------------------------------------------------------------------
# Integration: transform_csv — special_chars.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: special_chars.csv ===")
data = (SAMPLES / "special_chars.csv").read_bytes()
mapping = {"Title": "ProductName", "Variant SKU": "SKU", "Variant Price": "Price"}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)

handle_map = {r["Title"]: r["Handle"] for r in rows}
check("slugify: Café → cafe-racer-jacket",
      handle_map.get("Café Racer Jacket"), "cafe-racer-jacket")
check("slugify: Björk → bjork-edition-tee",
      handle_map.get("Björk Edition Tee"), "bjork-edition-tee")
check("slugify: Größe → große-xl-hoodie",
      handle_map.get("Größe XL Hoodie"), "große-xl-hoodie")
check("slugify: handle non-empty for all rows",
      all(r["Handle"] != "" for r in rows), True)


# ---------------------------------------------------------------------------
# Integration: transform_csv — multilingual.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: multilingual.csv ===")
data = (SAMPLES / "multilingual.csv").read_bytes()
mapping = {"Title": "ProductName", "Variant SKU": "SKU", "Variant Price": "Price"}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)
check("multilingual: 8 rows",   len(rows), 8)
check("multilingual: titles preserved",
      any(r["Title"] == "青いTシャツ" for r in rows), True)
check("multilingual: handles generated",
      all(r["Handle"] != "" for r in rows), True)


# ---------------------------------------------------------------------------
# Integration: transform_csv — duplicate_titles.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: duplicate_titles.csv ===")
data = (SAMPLES / "duplicate_titles.csv").read_bytes()
mapping = {"Title": "ProductName", "Variant SKU": "SKU", "Variant Price": "Price"}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)
blue_rows = [r for r in rows if r["Title"] == "Blue T-Shirt"]
check("duplicate: 4 blue shirt rows", len(blue_rows), 4)
check("duplicate: all same handle",
      len({r["Handle"] for r in blue_rows}), 1)
check("duplicate: handle is blue-t-shirt",
      blue_rows[0]["Handle"], "blue-t-shirt")


# ---------------------------------------------------------------------------
# Integration: transform_csv — euro_semicolon.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: euro_semicolon.csv ===")
data = (SAMPLES / "euro_semicolon.csv").read_bytes()
mapping = {
    "Title": "ProductName", "Variant SKU": "SKU",
    "Variant Price": "Price", "Variant Inventory Qty": "Stock",
}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)
check("semicolon: 6 rows", len(rows), 6)
check("semicolon: price parsed",
      rows[0]["Variant Price"], "19.99")
check("semicolon: large EUR price",
      rows[5]["Variant Price"], "1299.00")
check("semicolon: title intact",
      rows[4]["Title"], "Weißes Hemd")


# ---------------------------------------------------------------------------
# Integration: transform_csv — empty_values.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: empty_values.csv ===")
data = (SAMPLES / "empty_values.csv").read_bytes()
mapping = {
    "Title": "ProductName", "Variant SKU": "SKU",
    "Variant Price": "Price", "Body (HTML)": "Description",
}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)
check("empty vals: rows loaded",    len(rows) >= 4, True)
check("empty vals: Published set",  all(r["Published"] == "TRUE" for r in rows), True)
check("empty vals: handle for title-only",
      any(r["Handle"] == "title-only-product" for r in rows), True)


# ---------------------------------------------------------------------------
# Integration: transform_csv — whitespace_padding.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: whitespace_padding.csv ===")
data = (SAMPLES / "whitespace_padding.csv").read_bytes()
# Stripped column name should be used in mapping
mapping = {"Title": "ProductName", "Variant SKU": "SKU", "Variant Price": "Price"}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)
check("whitespace: 3 rows", len(rows), 3)
check("whitespace: title mapped", rows[0]["Title"], "Blue T-Shirt")
check("whitespace: handle generated", rows[0]["Handle"], "blue-t-shirt")


# ---------------------------------------------------------------------------
# Integration: transform_csv — long_values.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: long_values.csv ===")
data = (SAMPLES / "long_values.csv").read_bytes()
mapping = {"Title": "ProductName", "Variant SKU": "SKU", "Variant Price": "Price"}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)
long_row = next((r for r in rows if r["Variant SKU"] == "SKU-002"), None)
check("long vals: row present",        long_row is not None, True)
check("long vals: title not truncated",
      long_row is not None and len(long_row["Title"]) > 50, True)
check("long vals: handle generated",
      long_row is not None and long_row["Handle"] != "", True)


# ---------------------------------------------------------------------------
# Unit: extract_size_from_sku
# ---------------------------------------------------------------------------
print("\n=== extract_size_from_sku ===")
check("TSH-001-S",        extract_size_from_sku("TSH-001-S"),       "S")
check("TSH-001-M",        extract_size_from_sku("TSH-001-M"),       "M")
check("TSH-001-L",        extract_size_from_sku("TSH-001-L"),       "L")
check("TSH-001-XL",       extract_size_from_sku("TSH-001-XL"),      "XL")
check("HOD-002-S",        extract_size_from_sku("HOD-002-S"),       "S")
check("HOODIE_BLACK_XL",  extract_size_from_sku("HOODIE_BLACK_XL"), "XL")
check("SHOE-42",          extract_size_from_sku("SHOE-42"),         "42")
check("no size token",    extract_size_from_sku("TSH-001-RED"),     None)
check("empty SKU",        extract_size_from_sku(""),                None)
check("SKU-XXL",          extract_size_from_sku("SKU-XXL"),         "XXL")
check("numeric 36",       extract_size_from_sku("PANTS-36"),        "36")
check("no separator",     extract_size_from_sku("PLAINSKU"),        None)


# ---------------------------------------------------------------------------
# Integration: transform_csv — duplicate_titles_variants.csv
# ---------------------------------------------------------------------------
print("\n=== transform_csv: duplicate_titles_variants.csv ===")
VARIANTS_CSV = Path(__file__).parent.parent.parent / "samples" / "duplicate_titles_variants.csv"
data = VARIANTS_CSV.read_bytes()
mapping = {
    "Title": "ProductName",
    "Variant SKU": "SKU",
    "Variant Price": "Price",
    "Body (HTML)": "Description",
}
csv_out = transform_csv(data, mapping)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)

check("variants: 6 rows total", len(rows), 6)

blue_rows = [r for r in rows if r["Title"] == "Blue T-Shirt"]
red_rows  = [r for r in rows if r["Title"] == "Red Hoodie"]

check("variants: 4 blue shirt rows",  len(blue_rows), 4)
check("variants: 2 red hoodie rows",  len(red_rows), 2)

# All rows with same title share the same handle
check("variants: blue handle consistent", len({r["Handle"] for r in blue_rows}), 1)
check("variants: red handle consistent",  len({r["Handle"] for r in red_rows}), 1)
check("variants: blue handle value",  blue_rows[0]["Handle"], "blue-t-shirt")
check("variants: red handle value",   red_rows[0]["Handle"],  "red-hoodie")

# Option1 Name = Size for all variant rows
check("variants: blue Option1 Name = Size",
      all(r["Option1 Name"] == "Size" for r in blue_rows), True)
check("variants: red Option1 Name = Size",
      all(r["Option1 Name"] == "Size" for r in red_rows), True)

# Option1 Value matches the size token from SKU
size_map = {r["Variant SKU"]: r["Option1 Value"] for r in rows}
check("variants: TSH-001-S → S",  size_map.get("TSH-001-S"),  "S")
check("variants: TSH-001-M → M",  size_map.get("TSH-001-M"),  "M")
check("variants: TSH-001-L → L",  size_map.get("TSH-001-L"),  "L")
check("variants: TSH-001-XL → XL",size_map.get("TSH-001-XL"), "XL")
check("variants: HOD-002-S → S",  size_map.get("HOD-002-S"),  "S")
check("variants: HOD-002-M → M",  size_map.get("HOD-002-M"),  "M")

# Prices still normalized
check("variants: price normalized", blue_rows[0]["Variant Price"], "19.99")


# ---------------------------------------------------------------------------
# Integration: non-variant products still use Default Title
# ---------------------------------------------------------------------------
print("\n=== transform_csv: non-variant uses Default Title ===")
unique_csv = b"ProductName,SKU,Price\nUnique Product,UNQ-001,9.99\n"
csv_out = transform_csv(unique_csv, {"Title": "ProductName", "Variant SKU": "SKU", "Variant Price": "Price"})
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)
check("non-variant: Option1 Name = Title",         rows[0]["Option1 Name"],  "Title")
check("non-variant: Option1 Value = Default Title", rows[0]["Option1 Value"], "Default Title")


# ---------------------------------------------------------------------------
# Integration: manual Option1 mapping overrides auto-detection
# ---------------------------------------------------------------------------
print("\n=== transform_csv: manual Option1 overrides variant detection ===")
data = VARIANTS_CSV.read_bytes()
mapping_with_manual_opt1 = {
    "Title": "ProductName",
    "Variant SKU": "SKU",
    "Variant Price": "Price",
    "Option1 Name": "SKU",   # user manually mapped both Option1 fields
    "Option1 Value": "SKU",
}
csv_out = transform_csv(data, mapping_with_manual_opt1)
reader = csv.DictReader(io.StringIO(csv_out.decode("utf-8")))
rows = list(reader)
# Auto-detection should NOT have run; Option1 Name should be the mapped SKU value
check("manual override: Option1 Name != Size",
      all(r["Option1 Name"] != "Size" for r in rows), True)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
total = sum(
    1 for line in open(__file__)
    if "check(" in line and not line.strip().startswith("#")
)
print(f"\n{'='*50}")
if _failures:
    print(f"\033[91m{len(_failures)} FAILED / {total} total\033[0m")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
else:
    print(f"\033[92mAll tests passed ({total} checks)\033[0m")
