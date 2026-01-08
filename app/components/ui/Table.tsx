import React from 'react';

/**
 * Table Component - Reusable UI Component
 */

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface TableProps<T> {
  data: readonly T[];
  columns: Column<T>[];
  onRowClick?: (row: unknown) => void;
}

export function Table<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
}: TableProps<T>): React.ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr
              key={index}
              onClick={() => {
                void onRowClick?.(row);
              }}
              className={`
                cursor-pointer
                ${onRowClick ? 'hover:bg-gray-50' : ''}
              `}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
