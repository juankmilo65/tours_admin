/**
 * Textarea Component - Reusable UI Component
 */

import React, { type TextareaHTMLAttributes, type JSX } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = '',
  rows = 4,
  ...props
}: TextareaProps): JSX.Element {
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
      <textarea
        className={`
          px-4 py-2
          border rounded-lg
          focus:outline-none
          focus:ring-2
          disabled:bg-gray-100
          disabled:cursor-not-allowed
          resize-vertical
          ${className}
        `}
        rows={rows}
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
