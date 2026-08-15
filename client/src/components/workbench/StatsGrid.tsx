interface StatItem {
  label: string;
  value: number | string;
  change?: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
      marginBottom: 28,
    }}>
      {stats.map((stat, i) => (
        <div
          key={i}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
            transition: 'box-shadow 200ms',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px var(--border-subtle), 0 1px 3px rgba(0,0,0,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)';
          }}
        >
          <div style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 10,
          }}>
            {stat.label}
          </div>
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: 'var(--ink)',
          }}>
            {stat.value}
          </div>
          {stat.change && (
            <div style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              marginTop: 8,
              fontFamily: "'Geist Mono', monospace",
            }}>
              {stat.change}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
