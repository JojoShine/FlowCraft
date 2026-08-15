import { useState } from 'react';
import type { Task } from '../../types';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  return cells;
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const typeColors: Record<string, string> = {
  requirement: 'var(--indigo)',
  prototype: 'var(--purple)',
  design: 'var(--pink)',
  development: 'var(--ink)',
  testing: 'var(--amber)',
  document: 'var(--blue)',
  review: 'var(--green)',
  risk: 'var(--red)',
  research: 'var(--cyan)',
  deploy: 'var(--ink)',
};

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const today = new Date();
  const todayStr = fmt(today);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const grid = getMonthGrid(viewYear, viewMonth);
  const rows = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  const tasksByDate = new Map<string, Task[]>();
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    const key = t.dueDate.slice(0, 10);
    if (!tasksByDate.has(key)) tasksByDate.set(key, []);
    tasksByDate.get(key)!.push(t);
  });

  const prev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  const monthLabel = `${viewYear}年${viewMonth + 1}月`;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Month nav */}
      <div style={{
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prev} style={{
            width: 24, height: 24, border: 'none', borderRadius: 5,
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', minWidth: 80, textAlign: 'center' }}>
            {monthLabel}
          </span>
          <button onClick={next} style={{
            width: 24, height: 24, border: 'none', borderRadius: 5,
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <button onClick={goToday} style={{
          height: 24, padding: '0 8px', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 5, background: 'transparent', cursor: 'pointer',
          fontSize: 11, color: 'var(--ink-2)', fontWeight: 500,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          今天
        </button>
      </div>

      {/* Weekday header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{
            padding: '6px 0',
            textAlign: 'center',
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--ink-4)',
          }}>
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div>
        {rows.map((row, ri) => (
          <div key={ri} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: ri < rows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
          }}>
            {row.map((cell, ci) => {
              if (!cell.date) {
                return <div key={ci} style={{ height: 68, minWidth: 0, borderRight: ci < 6 ? '1px solid rgba(0,0,0,0.04)' : 'none' }} />;
              }
              const dateStr = fmt(cell.date);
              const isToday = dateStr === todayStr;
              const dayTasks = tasksByDate.get(dateStr) || [];
              const allItems = dayTasks.map((t) => ({
                kind: 'task' as const, id: t.id, title: t.title,
                color: typeColors[t.type] || 'var(--ink)', projectId: t.projectId, ref: t,
              }));

              return (
                <div key={ci} style={{
                  height: 68,
                  minWidth: 0,
                  padding: '3px 4px',
                  borderRight: ci < 6 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  background: isToday ? 'var(--canvas)' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--ink)' : 'var(--ink-3)',
                    fontFamily: "'Geist Mono', monospace",
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: isToday ? 'var(--ink)' : 'transparent',
                    ...(isToday ? { color: 'var(--surface)' } : {}),
                  }}>
                    {cell.date.getDate()}
                  </div>
                  {allItems.slice(0, 2).map((item) => (
                    <div
                      key={`${item.kind}-${item.id}`}
                      onClick={() => onTaskClick?.(item.ref)}
                      style={{
                        padding: '1px 4px',
                        borderRadius: 3,
                        fontSize: 10,
                        lineHeight: 1.4,
                        cursor: 'pointer',
                        background: item.kind === 'artifact' ? 'rgba(59,130,246,0.08)' : `${item.color}0A`,
                        color: 'var(--ink-2)',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                        transition: 'background 150ms',
                        borderLeft: `2px solid ${item.color}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = item.kind === 'artifact' ? 'rgba(59,130,246,0.16)' : `${item.color}1A`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = item.kind === 'artifact' ? 'rgba(59,130,246,0.08)' : `${item.color}0A`;
                      }}
                    >
                      {item.title}
                    </div>
                  ))}
                  {allItems.length > 2 && (
                    <div style={{ fontSize: 9, color: 'var(--ink-4)', paddingLeft: 4 }}>
                      +{allItems.length - 2}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
