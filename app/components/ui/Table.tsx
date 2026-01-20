import React from 'react';

/**
 * Modern Table Component - Reusable UI Component
 * Responsive design with mobile-friendly card view
 */

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  data: readonly T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

export function Table<T>({ data, columns, onRowClick }: TableProps<T>): React.ReactNode {
  if (data.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop/Tablet Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr
                key={index}
                onClick={() => {
                  void onRowClick?.(row);
                }}
                className={`
                  transition-colors duration-150 ease-in-out
                  ${onRowClick !== undefined ? 'hover:bg-blue-50 cursor-pointer' : ''}
                  ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                  >
                    {column.render
                      ? column.render((row as Record<string, unknown>)[column.key], row)
                      : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {data.map((row, index) => (
          <div
            key={index}
            onClick={() => {
              void onRowClick?.(row);
            }}
            className={`
              bg-white rounded-lg border border-gray-200 shadow-sm p-4
              transition-all duration-150 ease-in-out
              ${onRowClick !== undefined ? 'hover:border-blue-300 hover:shadow-md cursor-pointer' : ''}
            `}
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((column) => (
                <div key={String(column.key)} className="mb-3 last:mb-0">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {column.label}
                  </div>
                  <div className="text-sm text-gray-900">
                    {column.render
                      ? column.render((row as Record<string, unknown>)[column.key], row)
                      : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
