/**
 * TourWarningInline
 * Displays inline warning tooltips for multi-tour scheduling
 */

import type { JSX } from 'react';

interface TourWarningInlineProps {
  warnings: string[];
}

export function TourWarningInline({ warnings }: TourWarningInlineProps): JSX.Element | null {
  if (warnings.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: '6px',
      }}
    >
      {warnings.map((warning, idx) => (
        <div
          key={idx}
          style={{
            fontSize: '12px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: idx < warnings.length - 1 ? '4px' : 0,
          }}
        >
          <span>⚠</span>
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
