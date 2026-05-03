import { SHOPIFY_FIELDS } from "../types";

interface Props {
  rows: Record<string, string>[];
}

export function OutputPreview({ rows }: Props) {
  const visibleFields = SHOPIFY_FIELDS.filter((field) =>
    rows.some((row) => (row[field] ?? "") !== "")
  );

  if (visibleFields.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-[#D6E8D4] rounded-lg">
        <thead>
          <tr className="bg-[#EDF3EC] border-b border-[#D6E8D4]">
            {visibleFields.map((col) => (
              <th
                key={col}
                className="px-4 py-2.5 text-left text-[10px] font-mono font-medium uppercase tracking-widest text-[#346538] whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#EAEAEA] last:border-0">
              {visibleFields.map((col) => (
                <td
                  key={col}
                  className="px-4 py-2.5 text-sm text-[#111111] max-w-[200px] truncate"
                  title={row[col] ?? ""}
                >
                  {row[col] ?? (
                    <span className="text-[#B2B0AA]">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
