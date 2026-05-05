import { useState } from "react";
import { ErrorIcon, WarningIcon } from "./icons";

export interface ParsedError {
  row: number | null;
  errorCode: string;
  label: string;
  suggestion: string;
}

interface Props {
  onParsed: (result: ParsedError | null) => void;
  parsedError: ParsedError | null;
}

// Shopify error string patterns → structured error info
const PATTERNS: Array<{
  regex: RegExp;
  code: string;
  label: string;
  suggestion: string;
}> = [
  {
    regex: /ignored\s+line\s+(\d+).*(handle|exists)/i,
    code: "ERR_INCONSISTENT_HANDLE",
    label: "Handle already exists",
    suggestion: "Row {N} will be skipped because Shopify already processed a different Handle for this product. All variant rows must share the same Handle.",
  },
  {
    regex: /illegal\s+quot(?:ing|e)\s+(?:on\s+)?(?:line\s+)?(\d+)/i,
    code: "ERR_ILLEGAL_CHARACTERS",
    label: "Illegal quoting",
    suggestion: "Row {N} contains curly/smart quotes (“”) that break CSV parsing. These will be replaced with straight quotes during repair.",
  },
  {
    regex: /validation\s+failed.*variant\s+already\s+exists/i,
    code: "ERR_DEFAULT_TITLE_CLASH",
    label: "Variant already exists",
    suggestion: "A product has a 'Default Title' placeholder row alongside real variant rows. The placeholder will be removed during repair.",
  },
  {
    regex: /daily\s+variant\s+limit/i,
    code: "WARN_VARIANT_LIMIT_EXCEEDED",
    label: "Variant limit exceeded",
    suggestion: "A product has more than 100 variants — Shopify's hard limit. You will need to split this product into multiple listings.",
  },
  {
    regex: /handle\s+(?:already\s+)?exists/i,
    code: "ERR_INCONSISTENT_HANDLE",
    label: "Handle conflict",
    suggestion: "Shopify found the same Handle used for rows that don't match. Sync all variant rows to share one canonical Handle.",
  },
  {
    regex: /(?:line|row)\s+(\d+)/i,
    code: "GENERIC",
    label: "Row-specific error",
    suggestion: "Row {N} is flagged by Shopify. Check the diagnostic report for issues on this row.",
  },
];

function parseShopifyError(raw: string): ParsedError | null {
  if (!raw.trim()) return null;

  for (const { regex, code, label, suggestion } of PATTERNS) {
    const m = raw.match(regex);
    if (m) {
      const rowStr = m[1] ?? null;
      const row = rowStr ? parseInt(rowStr, 10) : null;
      return {
        row,
        errorCode: code,
        label,
        suggestion: row
          ? suggestion.replace("{N}", String(row))
          : suggestion.replace(" Row {N}", "").replace("Row {N}", ""),
      };
    }
  }
  return null;
}

export function PanicParser({ onParsed, parsedError }: Props) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");

  const handleChange = (value: string) => {
    setRaw(value);
    const result = parseShopifyError(value);
    onParsed(result);
  };

  return (
    <div className="border border-[#EAEAEA] rounded-lg bg-white overflow-hidden">
      <button
        className="w-full px-6 py-4 flex items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <ErrorIcon size={13} className="text-[#9F2F2D]" />
          <span className="text-sm font-medium text-[#111111]">
            Got a specific Shopify error message?
          </span>
        </div>
        <span className={`text-[#B2B0AA] text-lg leading-none transition-transform duration-150 ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>

      {open && (
        <div className="px-6 pb-5 border-t border-[#EAEAEA] pt-4 space-y-3">
          <p className="text-xs text-[#787774]">
            Paste the exact error string from Shopify's import log. The tool will identify which row is affected and explain the fix.
          </p>
          <textarea
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={'e.g. "Ignored line 45 because handle already exists"'}
            rows={2}
            className="w-full text-sm font-mono text-[#111111] placeholder-[#B2B0AA] border border-[#EAEAEA] rounded px-3 py-2.5 resize-none focus:outline-none focus:border-[#787774] transition-colors"
          />

          {parsedError && (
            <div className="flex items-start gap-3 bg-[#FBF3DB] border border-[#e8d98a] rounded-lg px-4 py-3">
              <WarningIcon size={13} className="text-[#956400] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-[#956400] mb-0.5">
                  {parsedError.label}
                  {parsedError.row && (
                    <span className="ml-2 text-[#956400]/70">— Row {parsedError.row}</span>
                  )}
                </p>
                <p className="text-xs text-[#956400]/80 leading-relaxed">
                  {parsedError.suggestion}
                </p>
              </div>
            </div>
          )}

          {raw && !parsedError && (
            <p className="text-xs text-[#B2B0AA]">
              Pattern not recognised. The diagnostic report above covers all detected issues in your file.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
