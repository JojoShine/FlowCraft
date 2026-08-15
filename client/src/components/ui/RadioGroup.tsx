import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
}

export function RadioGroup({ label, value, onValueChange, options, direction = 'vertical', disabled }: RadioGroupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        style={{
          display: 'flex',
          flexDirection: direction === 'vertical' ? 'column' : 'row',
          gap: direction === 'vertical' ? 10 : 8,
          width: '100%',
        }}
      >
        {options.map((opt) => {
          const isHorizontal = direction === 'horizontal';
          const isSelected = value === opt.value;

          return (
            <div
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                flex: isHorizontal ? 1 : undefined,
                padding: isHorizontal ? '6px 0' : undefined,
                border: isHorizontal ? `1px solid ${isSelected ? 'var(--ink)' : 'var(--border-default)'}` : 'none',
                borderRadius: 8,
                background: isHorizontal && isSelected ? 'var(--ink)' : 'transparent',
                transition: 'all 150ms',
              }}
              onClick={() => onValueChange?.(opt.value)}
            >
              {isHorizontal ? (
                <RadioGroupPrimitive.Item
                  value={opt.value}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0,
                    pointerEvents: 'none',
                  }}
                >
                  <RadioGroupPrimitive.Indicator />
                </RadioGroupPrimitive.Item>
              ) : (
                <RadioGroupPrimitive.Item
                  value={opt.value}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: '1.5px solid var(--border-default)',
                    background: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 150ms',
                    flexShrink: 0,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ink-3)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,24,27,0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <RadioGroupPrimitive.Indicator
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--ink)',
                    }}
                  />
                </RadioGroupPrimitive.Item>
              )}
              <label
                style={{
                  fontSize: 13,
                  fontWeight: isHorizontal ? 500 : 400,
                  color: isHorizontal && isSelected ? 'var(--canvas)' : 'var(--ink)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {opt.label}
              </label>
            </div>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
