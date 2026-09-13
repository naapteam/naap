"use client";

/**
 * Real <table> on desktop, the same data as stacked cards on phone — never
 * horizontal scroll (UI spec §9 quality floor). Breakpoint matches the app
 * shell's own sidebar/bottom-nav collapse at 840px.
 *
 * Client component (it attaches row-click handlers unconditionally) — a
 * Server Component page should fetch rows and hand them to a small client
 * wrapper that defines `columns` (which carries render functions) locally,
 * rather than passing column defs down as props. See
 * components/intake/IntakeListTable.tsx for the pattern.
 */
export type DataGridColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
};

export function DataGrid<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
}: {
  columns: DataGridColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
}) {
  if (rows.length === 0 && emptyState) {
    return (
      <div className="rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-6 text-center text-[#4A5057]">
        {emptyState}
      </div>
    );
  }

  return (
    <>
      <table className="hidden w-full border-collapse text-left min-[840px]:table">
        <thead>
          <tr className="border-b-[1.5px] border-[#C9CFD4]">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 text-sm font-normal text-[#4A5057] ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`h-10 border-b border-[#C9CFD4] ${
                onRowClick ? "cursor-pointer hover:bg-[#F2F4F5]" : ""
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 text-[17px] tabular-nums text-[#14171A] ${
                    c.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col gap-2 min-[840px]:hidden">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={`rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-3 ${
              onRowClick ? "cursor-pointer" : ""
            }`}
          >
            {columns.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-3 py-1 text-[17px] text-[#14171A]"
              >
                <span className="text-sm text-[#4A5057]">{c.header}</span>
                <span className="tabular-nums">{c.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
