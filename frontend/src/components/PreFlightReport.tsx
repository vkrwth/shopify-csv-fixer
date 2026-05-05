import { ErrorIcon, ShieldCheckIcon, WarningIcon } from "./icons";
import type { DiagnosticIssue, DiagnosticReport, RepairOptions } from "../types";

interface Props {
  report: DiagnosticReport;
  repairOptions: RepairOptions;
  onRepairOptionsChange: (opts: RepairOptions) => void;
  onContinue: () => void;
}

const ERROR_LABELS: Record<string, string> = {
  ERR_NON_UTF8: "Encoding",
  ERR_ILLEGAL_CHARACTERS: "Encoding",
  ERR_INCONSISTENT_HANDLE: "Handle mismatch",
  ERR_DEFAULT_TITLE_CLASH: "Default Title conflict",
  ERR_DUPLICATE_TITLE_NO_HANDLE: "Missing Handle",
  ERR_PARSE_FAILED: "Parse error",
  WARN_NON_STANDARD_HEADERS: "Non-standard columns",
  WARN_VARIANT_LIMIT_EXCEEDED: "Variant limit",
  WARN_CONTROL_CHARACTERS: "Control characters",
  WARN_WOOCOMMERCE_FORMAT: "WooCommerce format",
};

function rowLabel(rows: number[] | "global"): string {
  if (rows === "global") return "Entire file";
  if (rows.length === 0) return "";
  if (rows.length === 1) return `Row ${rows[0]}`;
  if (rows.length <= 4) return `Rows ${rows.join(", ")}`;
  return `Rows ${rows.slice(0, 3).join(", ")} +${rows.length - 3} more`;
}

function IssueRow({ issue }: { issue: DiagnosticIssue }) {
  const isError = issue.code.startsWith("ERR");
  return (
    <div className="flex gap-3 py-3.5 border-b border-[#EAEAEA] last:border-0">
      <div className="mt-0.5 shrink-0">
        {isError ? (
          <ErrorIcon size={13} className="text-[#9F2F2D]" />
        ) : (
          <WarningIcon size={13} className="text-[#956400]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-[10px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded ${
              isError
                ? "bg-[#FDEBEC] text-[#9F2F2D]"
                : "bg-[#FBF3DB] text-[#956400]"
            }`}
          >
            {ERROR_LABELS[issue.code] ?? issue.code}
          </span>
          {issue.rows !== "global" && issue.rows.length > 0 && (
            <span className="text-[11px] text-[#B2B0AA]">{rowLabel(issue.rows)}</span>
          )}
        </div>
        <p className="text-sm text-[#111111] leading-snug">{issue.msg}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: "error" | "warning" | "neutral";
}) {
  const valueClass =
    accent === "error"
      ? "text-[#9F2F2D]"
      : accent === "warning"
      ? "text-[#956400]"
      : "text-[#111111]";
  return (
    <div className="text-left">
      <p className={`text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      <p className="text-[11px] text-[#787774] mt-0.5">{label}</p>
    </div>
  );
}

function RepairCheckbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border border-[#B2B0AA] accent-[#111111] cursor-pointer"
      />
      <div>
        <p className="text-sm font-medium text-[#111111]">{label}</p>
        <p className="text-xs text-[#787774] mt-0.5">{description}</p>
      </div>
    </label>
  );
}

export function PreFlightReport({ report, repairOptions, onRepairOptionsChange, onContinue }: Props) {
  const { summary, issues, diffPreview } = report;
  const clean = summary.errorsCount === 0 && summary.warningsCount === 0;

  const errors = issues.filter((i) => i.code.startsWith("ERR"));
  const warnings = issues.filter((i) => i.code.startsWith("WARN"));

  const hasEncodingIssue =
    issues.some((i) => i.code === "ERR_ILLEGAL_CHARACTERS" || i.code === "ERR_NON_UTF8" || i.code === "WARN_CONTROL_CHARACTERS");
  const hasHandleIssue = issues.some((i) => i.code === "ERR_INCONSISTENT_HANDLE");
  const hasPlaceholderIssue = issues.some((i) => i.code === "ERR_DEFAULT_TITLE_CLASH");

  const set = (key: keyof RepairOptions) => (val: boolean) =>
    onRepairOptionsChange({ ...repairOptions, [key]: val });

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="border border-[#EAEAEA] rounded-lg bg-white p-6">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#B2B0AA] mb-5">
          Pre-Flight Diagnostic
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <SummaryCard value={summary.productCount} label="Products" />
          <SummaryCard value={summary.variantCount} label="Variants" />
          <SummaryCard
            value={summary.errorsCount}
            label={summary.errorsCount === 1 ? "Error" : "Errors"}
            accent={summary.errorsCount > 0 ? "error" : "neutral"}
          />
          <SummaryCard
            value={summary.warningsCount}
            label={summary.warningsCount === 1 ? "Warning" : "Warnings"}
            accent={summary.warningsCount > 0 ? "warning" : "neutral"}
          />
        </div>
      </div>

      {/* Issues */}
      {clean ? (
        <div className="border border-[#EAEAEA] rounded-lg bg-white px-6 py-5 flex items-center gap-3">
          <ShieldCheckIcon size={16} className="text-[#346538] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#111111]">No issues found</p>
            <p className="text-xs text-[#787774] mt-0.5">
              Your file looks clean. Proceed to map columns and download.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-[#EAEAEA] rounded-lg bg-white overflow-hidden">
          {errors.length > 0 && (
            <div>
              <div className="px-6 py-3 border-b border-[#EAEAEA] bg-[#FDEBEC]">
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#9F2F2D]">
                  {errors.length} {errors.length === 1 ? "Error" : "Errors"} — will be repaired
                </p>
              </div>
              <div className="px-6">
                {errors.map((issue, i) => (
                  <IssueRow key={i} issue={issue} />
                ))}
              </div>
            </div>
          )}
          {warnings.length > 0 && (
            <div className={errors.length > 0 ? "border-t border-[#EAEAEA]" : ""}>
              <div className="px-6 py-3 border-b border-[#EAEAEA] bg-[#FBF3DB]">
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#956400]">
                  {warnings.length} {warnings.length === 1 ? "Warning" : "Warnings"} — review recommended
                </p>
              </div>
              <div className="px-6">
                {warnings.map((issue, i) => (
                  <IssueRow key={i} issue={issue} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diff preview */}
      {diffPreview.length > 0 && (
        <div className="border border-[#EAEAEA] rounded-lg bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAEAEA]">
            <p className="text-sm font-medium text-[#111111]">Changes preview</p>
            <p className="text-xs text-[#787774] mt-0.5">
              Sample of rows that will be corrected
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-[#EAEAEA] bg-[#FBFBFA]">
                  <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest text-[#787774] w-16">Row</th>
                  <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest text-[#787774] w-28">Field</th>
                  <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest text-[#787774]">Before</th>
                  <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest text-[#787774]">After</th>
                </tr>
              </thead>
              <tbody>
                {diffPreview.map((entry, i) => (
                  <tr key={i} className="border-b border-[#EAEAEA] last:border-0">
                    <td className="px-4 py-2.5 text-[#787774] tabular-nums">{entry.row}</td>
                    <td className="px-4 py-2.5 text-[#787774]">{entry.field}</td>
                    <td className="px-4 py-2.5 font-mono">
                      <span className="text-[#9F2F2D] bg-[#FDEBEC] px-1.5 py-0.5 rounded">
                        {entry.before || <em className="not-italic text-[#B2B0AA]">empty</em>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      <span className="text-[#346538] bg-[#EDF3EC] px-1.5 py-0.5 rounded">
                        {entry.after}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repair options */}
      {!clean && (
        <div className="border border-[#EAEAEA] rounded-lg bg-white p-6 space-y-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[#B2B0AA]">
            Automatic repairs
          </p>
          <div className="space-y-4">
            <RepairCheckbox
              checked={repairOptions.sanitizeEncoding}
              onChange={set("sanitizeEncoding")}
              disabled={!hasEncodingIssue}
              label="Fix encoding"
              description="Replace curly quotes with straight quotes, strip hidden control characters."
            />
            <RepairCheckbox
              checked={repairOptions.syncHandles}
              onChange={set("syncHandles")}
              disabled={!hasHandleIssue}
              label="Sync handles"
              description="Make all rows for the same product share the same Handle."
            />
            <RepairCheckbox
              checked={repairOptions.scrubPlaceholders}
              onChange={set("scrubPlaceholders")}
              disabled={!hasPlaceholderIssue}
              label="Remove Default Title rows"
              description="Delete placeholder rows that clash with real variant data."
            />
            <RepairCheckbox
              checked={repairOptions.partitionFile}
              onChange={set("partitionFile")}
              label="Split large file"
              description={`Download as a .zip with multiple parts if output exceeds 5,000 rows.${summary.totalRows > 5000 ? " (Recommended — your file is large.)" : ""}`}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-[#787774]">
          {summary.totalRows.toLocaleString()} rows · {summary.productCount.toLocaleString()} products
        </p>
        <button
          className="px-5 py-2.5 text-sm font-medium text-white bg-[#111111] rounded transition-colors duration-150 hover:bg-[#333333] active:scale-[0.98]"
          onClick={onContinue}
        >
          Continue to mapping →
        </button>
      </div>
    </div>
  );
}
