# Broken Shopify Variant CSV Test Pack

These 10 CSV files are designed to test whether the tool can safely fix common Shopify product/variant import problems.

Expected fixes by file:

1. `01_size_from_sku_duplicates.csv` — same product title repeated; size should be detected from SKU suffixes S/M/L/XL.
2. `02_european_prices_and_sizes.csv` — European prices like `€29,95`; numeric sizes 36/38/40 should become Size variants.
3. `03_color_and_size_columns.csv` — explicit Color and Size columns; should support two-option variants if your tool handles Option1/Option2.
4. `04_duplicate_titles_with_missing_handles.csv` — empty Handle column; handles should be generated from Title while preserving variant rows.
5. `05_parent_handle_missing_variant_rows.csv` — variant rows missing parent handle; blank handles should be filled from the previous product handle/title group.
6. `06_sizes_in_description_only.csv` — size appears only in Description; advanced test. If unsupported, tool should warn, not silently produce bad variants.
7. `07_accented_titles_handle_generation.csv` — accented/special titles; handles should be slug-safe: `cafe-racer-jacket`, `mens-summer-shorts`.
8. `08_mixed_single_and_variant_products.csv` — mix of single products and duplicate-title variant products.
9. `09_wrong_case_and_bool_values.csv` — lowercase headers, European prices, published/status normalization.
10. `10_duplicate_titles_no_detectable_variant.csv` — duplicate titles but no detectable size/color; tool should warn that variants were detected but no option value could be inferred.

Important: file 10 is intentionally ambiguous. A safe tool should NOT pretend it fixed variants 100%; it should warn the user.
