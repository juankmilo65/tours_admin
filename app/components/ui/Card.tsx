/**
 * Card Component - Reusable UI Component
 */

import type { JSX, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  className?: string;
}

export function Card({ children, title, actions, className = '' }: CardProps): JSX.Element {
  const hasHeader = title !== undefined || actions !== undefined;

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          {title !== undefined && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {actions !== undefined && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
