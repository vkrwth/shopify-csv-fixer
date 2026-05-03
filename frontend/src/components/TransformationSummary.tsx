import { CheckIcon, WarningIcon } from "./icons";
import type { Mapping } from "../types";
import type { PreviewMeta } from "../utils/preview";

interface Props {
  mapping: Mapping;
  meta: PreviewMeta;
}

export function TransformationSummary({ mapping, meta }: Props) {
  const items: string[] = [];
  const warnings: string[] = [];

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  if (mappedCount > 0) {
    items.push(
      `${mappedCount} column${mappedCount !== 1 ? "s" : ""} matched to Shopify format`
    );
  }

  if (!mapping["Handle"] && mapping["Title"]) {
    items.push(`Handles generated automatically from "${mapping["Title"]}"`);
  }

  if (mapping["Variant Price"]) {
    items.push("Prices normalized (e.g. 19,99 → 19.99, € symbols removed)");
  }

  if (mapping["Variant Inventory Qty"]) {
    items.push("Stock quantities converted to whole numbers");
  }

  if (!mapping["Published"]) {
    items.push("All products set to Published automatically");
  }

  if (meta.hasDuplicateTitles) {
    items.push("Variants detected from repeated titles");
  }

  if (meta.variantsWithSizeDetected) {
    items.push("Sizes detected from SKU codes");
  }

  // Only show the default-variant message when there are no auto-detected variants
  if (!meta.hasDuplicateTitles && (!mapping["Option1 Name"] || !mapping["Option1 Value"])) {
    items.push("Default product variant filled in automatically");
  }

  if (meta.variantsWithoutSize) {
    warnings.push(
      "Repeated product titles found, but no variant value was detected. These may import as duplicate or invalid variants."
    );
  }

  if (items.length === 0 && warnings.length === 0) return null;

  return (
    <div className="border border-[#EAEAEA] rounded-lg bg-white p-6 space-y-4">
      {items.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-[#787774] mb-4">
            What we fixed
          </p>
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-[#111111] leading-snug"
              >
                <CheckIcon size={13} className="text-[#346538] shrink-0 mt-[2px]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-2 pt-1 border-t border-[#EAEAEA]">
          {warnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-2 pt-3 text-xs text-[#956400]"
            >
              <WarningIcon size={12} className="shrink-0 mt-px" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
