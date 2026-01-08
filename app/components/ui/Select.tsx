import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import React from 'react';
import { useTranslation } from '~/lib/i18n/utils';

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  id,
}: SelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useLayoutEffect(() => {
    window.setTimeout(() => {
      if (!open) setHighlightedIndex(-1);
    }, 0);
  }, [open]);

  const toggle = (): void => {
    if (disabled === true) return;
    setOpen((v) => !v);
  };

  const handleSelect = (opt: Option) => {
    if (opt.disabled === true) return;
    onChange(opt.value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled === true) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((v) => !v);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open && highlightedIndex >= 0) {
      const el = rootRef.current?.querySelectorAll('[data-select-item]')[highlightedIndex] as
        | HTMLElement
        | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  return (
    <div
      ref={rootRef}
      className={`custom-select ${className ?? ''}`}
      id={id}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="custom-select-button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span
          style={{
            color: selected ? 'var(--color-neutral-900)' : 'var(--color-neutral-500)',
            flex: '1 1 auto',
            textAlign: 'left',
          }}
        >
          {selected ? selected.label : (placeholder ?? t('common.select'))}
        </span>
        <span style={{ color: 'var(--color-neutral-500)', marginLeft: '8px' }}>▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid var(--color-neutral-200)',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            maxHeight: '280px',
            overflow: 'auto',
            zIndex: 2000,
            padding: '8px 0',
            margin: 0,
            listStyle: 'none',
          }}
        >
          {options.map((opt, idx) => {
            const isHighlighted = highlightedIndex === idx;
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                data-select-item
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`select-item${isHighlighted ? ' highlighted' : ''}${isSelected ? ' selected' : ''}`}
                style={{
                  padding: '8px 12px',
                  cursor: opt.disabled === true ? 'not-allowed' : 'pointer',
                  color:
                    opt.disabled === true ? 'var(--color-neutral-400)' : 'var(--color-neutral-900)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: '1 1 auto' }}>{opt.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
