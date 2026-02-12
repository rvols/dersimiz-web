'use client';

import { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  actionsHeader?: string;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data',
  onRowClick,
  rowActions,
  actionsHeader = 'Actions',
}: DataTableProps<T>) {
  return (
    <div className="bg-neutral-white rounded-card border border-neutral-outline shadow-card overflow-hidden">
      {data.length === 0 ? (
        <p className="p-8 text-neutral-slate">{emptyMessage}</p>
      ) : (
        <table className="w-full text-left">
          <thead className="bg-neutral-mist border-b border-neutral-outline">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-sm font-medium text-neutral-carbon ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && (
                <th className="px-4 py-3 text-sm font-medium text-neutral-carbon w-16">
                  {actionsHeader}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={`border-b border-neutral-outline last:border-0 ${
                  onRowClick ? 'hover:bg-neutral-mist/50 cursor-pointer' : ''
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                    {col.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-sm" onClick={(e) => onRowClick && e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
