import { useState } from 'react';

interface Artifact {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  _rawDate?: string;
  size?: string | number | undefined;
  taskName?: string;
  owner?: string;
  filePath?: string | null;
}

interface ArtifactsCalendarProps {
  artifacts: Artifact[];
}

const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function ArtifactsCalendar({ artifacts }: ArtifactsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  const totalDays = lastDay.getDate();
  const prevLast = new Date(year, month, 0).getDate();
  const today = new Date();

  // Map artifacts to dates using _rawDate (ISO string) or updatedAt
  const artifactMap: Record<number, Artifact[]> = {};
  artifacts.forEach(artifact => {
    const dateStr = artifact._rawDate || artifact.updatedAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!artifactMap[day]) artifactMap[day] = [];
      artifactMap[day].push(artifact);
    }
  });

  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar cells
  const cells: React.ReactNode[] = [];

  // Day headers
  dayNames.forEach(d => {
    cells.push(
      <div key={`dh-${d}`} style={{
        padding: 8,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--ink-3)',
        background: 'var(--canvas)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {d}
      </div>
    );
  });

  // Previous month days
  for (let i = 1; i < startDow; i++) {
    cells.push(
      <div key={`prev-${i}`} style={{
        minHeight: 100,
        padding: 6,
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        opacity: 0.35,
      }}>
        <div style={{
          fontSize: 11,
          color: 'var(--ink-2)',
          fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
          padding: '1px 3px',
        }}>
          {prevLast - startDow + 1 + i}
        </div>
      </div>
    );
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const evts = artifactMap[d] || [];
    const cls = isToday(d);

    cells.push(
      <div key={`day-${d}`} style={{
        minHeight: 100,
        padding: 6,
        borderRight: d % 7 === 0 ? 'none' : '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'background 150ms',
        background: cls ? 'rgba(24,24,27,0.04)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!cls) e.currentTarget.style.background = 'var(--canvas)';
      }}
      onMouseLeave={(e) => {
        if (!cls) e.currentTarget.style.background = 'transparent';
      }}
      >
        <div style={{
          fontSize: 11,
          fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
          padding: '1px 3px',
          background: cls ? 'var(--ink)' : 'transparent',
          color: cls ? 'var(--canvas)' : 'var(--ink-2)',
          borderRadius: '50%',
          width: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: cls ? 600 : 400,
        }}>
          {d}
        </div>
        {evts.slice(0, 2).map((evt, idx) => {
          const typeColorMap: Record<string, string> = {
            document: 'var(--ink-2)',
            prototype: 'var(--ink)',
            diagram: 'var(--ink-3)',
            spreadsheet: 'var(--ink-1)',
            report: '#27272A',
            folder: 'var(--ink-4)',
          };
          return (
            <div
              key={idx}
              title={evt.name}
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
                lineHeight: 1.4,
                marginTop: 2,
                background: 'var(--surface-raised)',
                color: 'var(--ink-2)',
                borderLeft: `2px solid ${typeColorMap[evt.type] || 'var(--ink-4)'}`,
              }}
            >
              {evt.name}
            </div>
          );
        })}
        {evts.length > 2 && (
          <div style={{
            fontSize: 10,
            padding: '2px 6px',
            marginTop: 2,
            color: 'var(--ink-3)',
            cursor: 'default',
          }}>
            +{evts.length - 2} 更多
          </div>
        )}
      </div>
    );
  }

  // Next month days
  const remaining = 7 - ((startDow - 1 + totalDays) % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push(
        <div key={`next-${i}`} style={{
          minHeight: 100,
          padding: 6,
          borderRight: i % 7 === 0 ? 'none' : '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          opacity: 0.35,
        }}>
          <div style={{
            fontSize: 11,
            color: 'var(--ink-2)',
            fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
            padding: '1px 3px',
          }}>
            {i}
          </div>
        </div>
      );
    }
  }

  return (
    <div style={{ flex: 1, flexDirection: 'column', gap: 0 }}>
      {/* Calendar header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handlePrevMonth}
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-2)',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--canvas)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--ink)',
            minWidth: 120,
            textAlign: 'center',
          }}>
            {year}年{monthNames[month]}
          </div>
          <button
            onClick={handleNextMonth}
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-2)',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--canvas)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <button
          onClick={handleToday}
          style={{
            fontSize: 12,
            color: 'var(--ink-3)',
            padding: '4px 10px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            background: 'var(--surface)',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--canvas)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
          }}
        >
          今天
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        flex: 1,
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--surface)',
      }}>
        {cells}
      </div>
    </div>
  );
}
