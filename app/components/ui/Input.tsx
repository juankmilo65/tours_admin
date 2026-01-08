/**
 * Input Component - Reusable UI Component
 */

import type { InputHTMLAttributes, JSX } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      {label !== undefined && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={`
          px-4 py-2
          border rounded-lg
          ${error !== undefined ? 'border-red-500' : 'border-gray-300'}
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          disabled:bg-gray-100
          disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {error !== undefined && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
