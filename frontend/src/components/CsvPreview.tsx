interface Props {
  columns: string[];
  rows: Record<string, string>[];
}

export function CsvPreview({ columns, rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-[#EAEAEA] rounded-lg">
        <thead>
          <tr className="bg-[#FBFBFA] border-b border-[#EAEAEA]">
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
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[#EAEAEA] last:border-0"
              style={{ transition: "background 150ms" }}
            >
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
