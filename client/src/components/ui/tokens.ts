export const tokens = {
  colors: {
    ink: '#18181B',
    text: '#52525B',
    muted: '#8B8B93',
    border: 'rgba(0,0,0,0.07)',
    borderHover: 'rgba(0,0,0,0.13)',
    borderFocus: '#18181B',
    surface: '#FFFFFF',
    canvas: '#FAFAFA',
    bgHover: '#F2F2F4',
    bgActive: '#EDEDF0',
    danger: '#DC2626',
  },
  radii: {
    sm: 6,
    md: 8,
    lg: 12,
  },
  fonts: {
    sans: "'Geist', sans-serif",
    mono: "'Geist Mono', monospace",
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
    md: '0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
    popover: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
  },
  transition: 'all 150ms ease',
} as const;
