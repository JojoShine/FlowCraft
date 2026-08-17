import { useState, useMemo } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

interface DatePickerProps {
  label?: string;
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  error?: string;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  let startWeekday = firstDay.getDay();
  if (startWeekday === 0) startWeekday = 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 1; i < startWeekday; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

export function DatePicker({ label, value, onChange, placeholder = '选择日期', error }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value || '');
  const [viewDate, setViewDate] = useState(() => selected || new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const displayValue = selected
    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`
    : '';

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
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          style={{
            boxSizing: 'border-box',
            height: 36,
            padding: '0 12px',
            fontSize: 13,
            fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
            color: displayValue ? 'var(--ink)' : 'var(--ink-3)',
            background: 'var(--surface)',
            border: `1px solid ${error ? 'var(--red)' : 'var(--border-default)'}`,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 150ms',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: 'var(--ink-3)', flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={{ flex: 1 }}>{displayValue || placeholder}</span>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            sideOffset={4}
            align="start"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              padding: 16,
              zIndex: 1000,
            }}
          >
            {/* Month nav */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  width: 28,
                  height: 28,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-3)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}>
                {year}年{month + 1}月
              </span>
              <button
                type="button"
                onClick={nextMonth}
                style={{
                  width: 28,
                  height: 28,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-3)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              marginBottom: 4,
            }}>
              {WEEKDAYS.map((w) => (
                <div key={w} style={{
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  textAlign: 'center',
                  padding: '4px 0',
                  fontWeight: 500,
                }}>
                  {w}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
            }}>
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;

                const dateStr = formatDate(day);
                const isSelected = value === dateStr;
                const isToday = formatDate(new Date()) === dateStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      onChange?.(dateStr);
                      setOpen(false);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 6,
                      background: isSelected ? 'var(--ink)' : 'transparent',
                      color: isSelected ? 'var(--canvas)' : 'var(--ink)',
                      fontSize: 12,
                      fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: isToday ? 600 : 400,
                      transition: 'background 100ms',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--surface-raised)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {error && (
        <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>
      )}
    </div>
  );
}
