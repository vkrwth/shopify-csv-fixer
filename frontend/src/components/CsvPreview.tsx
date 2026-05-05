interface Props {
  columns: string[];
  rows: Record<string, string>[];
  highlightRow?: number | null;
}

export function CsvPreview({ columns, rows, highlightRow }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-[#EAEAEA] rounded-lg">
        <thead>
          <tr className="bg-[#FBFBFA] border-b border-[#EAEAEA]">
            <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-widest text-[#B2B0AA] w-10">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-widest text-[#787774] whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const csvRow = i + 2; // CSV row number (1-indexed header + 1)
            const isHighlighted = highlightRow !== null && highlightRow !== undefined && csvRow === highlightRow;
            return (
              <tr
                key={i}
                className={`border-b border-[#EAEAEA] last:border-0 transition-colors duration-150 ${
                  isHighlighted
                    ? "bg-[#FBF3DB] hover:bg-[#FBF3DB]"
                    : "hover:bg-[#FBFBFA]"
                }`}
              >
                <td className="px-3 py-2.5 text-[11px] text-[#B2B0AA] tabular-nums">
                  {isHighlighted ? (
                    <span className="text-[#956400] font-medium">{csvRow}</span>
                  ) : (
                    csvRow
                  )}
                </td>
                {columns.map((col) => (
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
