interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

const sizeMap = { sm: 16, md: 24, lg: 36 };

export function Loading({ size = 'md', text, fullPage }: LoadingProps) {
  const dim = sizeMap[size];

  const spinner = (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="10" stroke="var(--surface-sunken)" strokeWidth="2.5" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );

  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: text ? 12 : 0,
    }}>
      {spinner}
      {text && (
        <span style={{
          fontSize: 13,
          color: 'var(--ink-3)',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          {text}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 200,
      }}>
        {content}
      </div>
    );
  }

  return content;
}
