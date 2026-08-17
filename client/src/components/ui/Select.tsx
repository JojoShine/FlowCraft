import { useState } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export function Select({ label, placeholder = '请选择', value, onValueChange, options, error, disabled, searchable = false }: SelectProps) {
  const [search, setSearch] = useState('');

  const filteredOptions = searchable && search
    ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--ink-2)',
          letterSpacing: '-0.01em',
        }}>
          {label}
        </label>
      )}
      <SelectPrimitive.Root value={value} onValueChange={(v) => { onValueChange?.(v); setSearch(''); }} disabled={disabled} onOpenChange={(open) => { if (!open) setSearch(''); }}>
        <SelectPrimitive.Trigger
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: 36,
            padding: '0 12px',
            fontSize: 13,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: 'var(--ink)',
            background: 'var(--surface)',
            border: `1px solid ${error ? 'var(--red)' : 'var(--border-default)'}`,
            borderRadius: 8,
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            opacity: disabled ? 0.5 : 1,
            transition: 'all 150ms',
          }}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: 'var(--ink-3)' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              padding: searchable ? '4px' : 4,
              zIndex: 1000,
              maxHeight: 280,
              overflow: 'hidden',
              width: 'var(--radix-select-trigger-width)',
            }}
          >
            {searchable && (
              <div style={{ padding: '4px 4px 6px' }}>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索..."
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 10px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: 'var(--ink)',
                    background: 'var(--surface-raised)',
                    outline: 'none',
                  }}
                />
              </div>
            )}
            <SelectPrimitive.Viewport>
              {filteredOptions.length === 0 && searchable ? (
                <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
                  无匹配选项
                </div>
              ) : filteredOptions.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  style={{
                    fontSize: 13,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: 'var(--ink)',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-raised)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginLeft: 8 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && (
        <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>
      )}
    </div>
  );
}
