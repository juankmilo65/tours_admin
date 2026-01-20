/**
 * Input Component - Reusable UI Component
 */

import React, { type InputHTMLAttributes, type JSX } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      {label !== undefined && (
        <label
          className="text-sm font-medium"
          style={{
            color:
              error !== undefined && error !== ''
                ? 'var(--color-error-600)'
                : 'var(--color-neutral-700)',
          }}
        >
          {label}
        </label>
      )}
      <input
        className={`
          px-4 py-2
          border rounded-lg
          focus:outline-none
          focus:ring-2
          disabled:bg-gray-100
          disabled:cursor-not-allowed
          ${className}
        `}
        style={
          {
            borderColor:
              error !== undefined && error !== ''
                ? 'var(--color-error-500)'
                : 'var(--color-neutral-300)',
            '--tw-ring-color':
              error !== undefined && error !== ''
                ? 'var(--color-error-200)'
                : 'var(--color-primary-200)',
          } as React.CSSProperties
        }
        {...props}
      />
      {error !== undefined && error !== '' && (
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-error-500)',
            marginTop: '0.25rem',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
