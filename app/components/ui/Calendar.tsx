/* eslint-disable no-unused-vars */
import React from 'react';

interface CalendarProps {
  label?: string;
  value?: string;
  onChange: (_value: string) => void;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
}

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartChange: (_startDate: string) => void;
  onEndChange: (_endDate: string) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
}

export function Calendar({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className = '',
}: CalendarProps): React.ReactNode {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label !== undefined && label !== null && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        className={`
          px-4 py-2 border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          text-gray-900
          transition-colors duration-200
          ${disabled ? 'opacity-50' : ''}
        `}
        style={{
          fontSize: '14px',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

/**
 * Date Range Picker Component - For start and end date selection
 */

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  startLabel = 'Fecha Inicio',
  endLabel = 'Fecha Fin',
  className = '',
}: DateRangePickerProps): React.ReactNode {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      <Calendar
        label={startLabel}
        value={startDate}
        onChange={onStartChange}
        maxDate={endDate}
        className="flex-1"
      />
      <Calendar
        label={endLabel}
        value={endDate}
        onChange={onEndChange}
        minDate={startDate}
        className="flex-1"
      />
    </div>
  );
}
