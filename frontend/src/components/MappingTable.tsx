import { useState } from "react";
import { CheckIcon, ChevronRightIcon, WarningIcon } from "./icons";
import { FIELD_GROUPS, RECOMMENDED_FIELDS, REQUIRED_FIELDS } from "../types";
import type { Mapping, ShopifyField } from "../types";

interface FieldRowProps {
  field: ShopifyField;
  columns: string[];
  mapping: Mapping;
  onChange: (field: ShopifyField, value: string) => void;
}

function StatusBadge({ field, mapping }: { field: ShopifyField; mapping: Mapping }) {
  const isMapped = !!mapping[field];
  const isRequired = REQUIRED_FIELDS.includes(field);
  const isRecommended = RECOMMENDED_FIELDS.includes(field);

  if (isMapped) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest bg-[#EDF3EC] text-[#346538] px-1.5 py-0.5 rounded-full whitespace-nowrap">
        <CheckIcon size={9} />
        Mapped
      </span>
    );
  }
  if (field === "Handle") {
    return <span className="text-[11px] text-[#B2B0AA] italic">auto</span>;
  }
  if (isRequired) {
    return (
      <span className="text-[10px] font-medium uppercase tracking-widest bg-[#FDEBEC] text-[#9F2F2D] px-1.5 py-0.5 rounded-full whitespace-nowrap">
        Required
      </span>
    );
  }
  if (isRecommended) {
    return (
      <span className="text-[10px] font-medium uppercase tracking-widest bg-[#FBF3DB] text-[#956400] px-1.5 py-0.5 rounded-full whitespace-nowrap">
        Rec.
      </span>
    );
  }
  return null;
}

function FieldRow({ field, columns, mapping, onChange }: FieldRowProps) {
  const isRequired = REQUIRED_FIELDS.includes(field);
  const isRecommended = RECOMMENDED_FIELDS.includes(field);

  return (
    <tr className="border-b border-[#EAEAEA] last:border-0">
      <td className="py-2.5 pr-4 whitespace-nowrap">
        <span className="text-sm text-[#111111] font-medium">{field}</span>
        {isRequired && (
          <span className="ml-1.5 text-[#9F2F2D] text-xs">*</span>
        )}
        {isRecommended && !isRequired && (
          <span className="ml-1.5 text-[#956400] text-xs">●</span>
        )}
      </td>
      <td className="py-2.5 pr-4">
        <div className="relative">
          <select
            className="w-full border border-[#EAEAEA] rounded px-3 py-1.5 pr-7 text-sm text-[#111111] bg-white focus:outline-none focus:border-muted transition-colors cursor-pointer"
            value={mapping[field] ?? ""}
            onChange={(e) => onChange(field, e.target.value)}
          >
            <option value="">Not mapped</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <ChevronRightIcon
            size={10}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B2B0AA] pointer-events-none rotate-90"
          />
        </div>
      </td>
      <td className="py-2.5 whitespace-nowrap">
        <StatusBadge field={field} mapping={mapping} />
      </td>
    </tr>
  );
}

interface SectionProps {
  fields: readonly ShopifyField[];
  columns: string[];
  mapping: Mapping;
  onChange: (field: ShopifyField, value: string) => void;
}

function FieldSection({ fields, columns, mapping, onChange }: SectionProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[#EAEAEA]">
          <th className="pb-2 text-left text-[10px] uppercase tracking-widest text-[#B2B0AA] font-medium w-[38%]">
            Shopify field
          </th>
          <th className="pb-2 text-left text-[10px] uppercase tracking-widest text-[#B2B0AA] font-medium w-[42%]">
            Your column
          </th>
          <th className="pb-2 text-left text-[10px] uppercase tracking-widest text-[#B2B0AA] font-medium w-[20%]">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <FieldRow
            key={field}
            field={field}
            columns={columns}
            mapping={mapping}
            onChange={onChange}
          />
        ))}
      </tbody>
    </table>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-medium uppercase tracking-widest text-[#787774] shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#EAEAEA]" />
    </div>
  );
}

interface Props {
  columns: string[];
  mapping: Mapping;
  onChange: (field: ShopifyField, value: string) => void;
  onAutoMap: () => void;
  onReset: () => void;
}

export function MappingTable({
  columns,
  mapping,
  onChange,
  onAutoMap,
  onReset,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isTitleMapped = !!mapping["Title"];
  const skuMapped = !!mapping["Variant SKU"];
  const priceMapped = !!mapping["Variant Price"];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-[#111111]">
            Match your file to Shopify format
          </h2>
          <p className="text-xs text-[#787774] mt-1">
            <span className="text-[#9F2F2D]">*</span> Required
            &nbsp;&nbsp;
            <span className="text-[#956400]">●</span> Recommended
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="text-xs text-[#787774] border border-[#EAEAEA] rounded px-2.5 py-1 hover:text-[#111111] hover:border-[#787774] transition-colors"
            onClick={onAutoMap}
          >
            Auto-map
          </button>
          <button
            className="text-xs text-[#787774] border border-[#EAEAEA] rounded px-2.5 py-1 hover:text-[#111111] hover:border-[#787774] transition-colors"
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Basic */}
      <div>
        <SectionLabel label="Basic" />
        <FieldSection
          fields={FIELD_GROUPS.basic}
          columns={columns}
          mapping={mapping}
          onChange={onChange}
        />
      </div>

      {/* Optional */}
      <div>
        <SectionLabel label="Optional" />
        <FieldSection
          fields={FIELD_GROUPS.optional}
          columns={columns}
          mapping={mapping}
          onChange={onChange}
        />
      </div>

      {/* Advanced */}
      <div>
        <button
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#B2B0AA] hover:text-[#787774] transition-colors"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <ChevronRightIcon
            size={9}
            className={`transition-transform duration-200 ${
              advancedOpen ? "rotate-90" : ""
            }`}
          />
          Advanced — only for products with variants
        </button>
        {advancedOpen && (
          <div className="mt-4">
            <p className="text-xs text-[#B2B0AA] mb-4">
              Handle is auto-generated from Title unless you map it manually
              here. Leave these blank for simple single-variant products.
            </p>
            <FieldSection
              fields={FIELD_GROUPS.advanced}
              columns={columns}
              mapping={mapping}
              onChange={onChange}
            />
          </div>
        )}
      </div>

      {/* Warnings */}
      {(!skuMapped || !priceMapped) && (
        <div className="space-y-2 pt-1 border-t border-[#EAEAEA]">
          {!skuMapped && (
            <div className="flex items-start gap-2 pt-3 text-xs text-[#956400]">
              <WarningIcon size={12} className="shrink-0 mt-px" />
              <span>
                Map <strong>Variant SKU</strong> to avoid duplicate products in
                Shopify
              </span>
            </div>
          )}
          {!priceMapped && (
            <div className="flex items-start gap-2 text-xs text-[#956400]">
              <WarningIcon size={12} className="shrink-0 mt-px" />
              <span>
                Map <strong>Variant Price</strong> so your products can be sold
              </span>
            </div>
          )}
        </div>
      )}

      {/* Ready state */}
      {isTitleMapped && skuMapped && priceMapped && (
        <div className="flex items-center gap-2.5 bg-[#EDF3EC] border border-[#D6E8D4] text-[#346538] rounded-lg px-4 py-3 text-sm font-medium">
          <CheckIcon size={13} />
          Ready to import into Shopify
        </div>
      )}
    </div>
  );
}
