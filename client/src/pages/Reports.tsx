import { useState } from 'react';
import { useReports } from '../hooks/useReports';
import { useProjectContext } from '../contexts/ProjectContext';
import { formatDate, getYearInTZ, getMonthInTZ, getDayInTZ } from '../utils/date';

interface ReportContent {
  summary: string;
  completed: string[];
  issues: string[];
  nextSteps: string[];
}

interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  label: string;
  date: string;
  content: ReportContent;
}

function parseReport(raw: { id: string; type: string; label: string; date: string; content: string }): Report | null {
  try {
    const content: ReportContent = typeof raw.content === 'string' ? JSON.parse(raw.content) : raw.content;
    return {
      id: raw.id,
      type: raw.type as Report['type'],
      label: raw.label,
      date: raw.date,
      content,
    };
  } catch {
    return null;
  }
}

const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const dayNames = ['一', '二', '三', '四', '五', '六', '日'];

const typeLabels: Record<string, string> = {
  daily: '日报',
  weekly: '周报',
  monthly: '月报',
  quarterly: '季度报',
  yearly: '年报',
};

const typeColors: Record<string, { bg: string; dot: string; text: string }> = {
  daily: { bg: 'var(--surface-raised)', dot: 'var(--ink-3)', text: 'var(--ink-2)' },
  weekly: { bg: 'var(--surface-raised)', dot: 'var(--ink-3)', text: 'var(--ink-2)' },
  monthly: { bg: 'rgba(113,113,122,0.1)', dot: 'var(--ink-3)', text: 'var(--ink-1)' },
  quarterly: { bg: 'rgba(82,82,91,0.08)', dot: 'var(--ink-2)', text: 'var(--ink-1)' },
  yearly: { bg: 'var(--ink)', dot: 'var(--canvas)', text: 'var(--canvas)' },
};

export function Reports() {
  const { selectedProjectId } = useProjectContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('all');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const { reports: rawReports } = useReports({
    projectId: selectedProjectId ?? undefined,
    year,
    month: month + 1,
  });

  const reportData: Report[] = rawReports.map(parseReport).filter((r): r is Report => r !== null);

  // Calculate calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  const totalDays = lastDay.getDate();
  const prevLast = new Date(year, month, 0).getDate();

  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  // Filter reports for current month
  const monthReports = reportData.filter(r => {
    return getYearInTZ(r.date) === year && getMonthInTZ(r.date) === month + 1;
  });

  const filtered = filter === 'all' ? monthReports : monthReports.filter(r => r.type === filter);

  // Map reports to dates
  const itemMap: Record<number, Report[]> = {};
  filtered.forEach(r => {
    const day = getDayInTZ(r.date);
    if (getYearInTZ(r.date) === year && getMonthInTZ(r.date) === month + 1) {
      if (!itemMap[day]) itemMap[day] = [];
      itemMap[day].push(r);
    }
  });

  // Generate calendar cells
  const cells: React.ReactNode[] = [];
  
  // Day headers
  dayNames.forEach(d => {
    cells.push(
      <div key={`dh-${d}`} style={{
        padding: '10px 8px',
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

  // Previous month filler days
  for (let i = 1; i < startDow; i++) {
    cells.push(
      <div key={`prev-${i}`} style={{
        minHeight: 100,
        padding: '6px 8px',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        opacity: 0.25,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", padding: '1px 3px' }}>
          {prevLast - startDow + 1 + i}
        </div>
      </div>
    );
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const evts = itemMap[d] || [];
    
    cells.push(
      <div
        key={`day-${d}`}
        style={{
          minHeight: 100,
          padding: '6px 8px',
          borderRight: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          transition: 'background 150ms',
          background: isToday(d) ? 'rgba(24,24,27,0.04)' : 'transparent',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
        onMouseEnter={(e) => {
          if (!isToday(d)) e.currentTarget.style.background = 'var(--canvas)';
        }}
        onMouseLeave={(e) => {
          if (!isToday(d)) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={{
          fontSize: 11,
          color: isToday(d) ? 'var(--canvas)' : 'var(--ink-3)',
          fontFamily: "'Geist Mono', monospace",
          padding: '1px 3px',
          ...(isToday(d) ? {
            background: 'var(--ink)',
            color: 'var(--canvas)',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
          } : {}),
        }}>
          {d}
        </div>
        {evts.map((e, idx) => {
          const colors = typeColors[e.type];
          return (
            <div
              key={idx}
              onClick={() => setViewingReport(e)}
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'opacity 150ms',
                background: colors.bg,
                color: colors.text,
              }}
              onMouseEnter={(ev) => ev.currentTarget.style.opacity = '0.75'}
              onMouseLeave={(ev) => ev.currentTarget.style.opacity = '1'}
              title={e.label}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: colors.dot }} />
              {e.label}
            </div>
          );
        })}
      </div>
    );
  }

  // Next month filler days
  const remaining = 7 - ((startDow - 1 + totalDays) % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push(
        <div key={`next-${i}`} style={{
          minHeight: 100,
          padding: '6px 8px',
          borderRight: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          opacity: 0.25,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", padding: '1px 3px' }}>
            {i}
          </div>
        </div>
      );
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCopyReport = (report: Report) => {
    const lines: string[] = [];
    lines.push(`# ${report.label}`);
    lines.push(`日期：${formatDate(report.date)}`);
    lines.push('');
    lines.push(`## 概要`);
    lines.push(report.content.summary);
    if (report.content.completed.length > 0) {
      lines.push('');
      lines.push('## 已完成');
      report.content.completed.forEach(item => lines.push(`- ${item}`));
    }
    if (report.content.issues.length > 0) {
      lines.push('');
      lines.push('## 问题与风险');
      report.content.issues.forEach(item => lines.push(`- ${item}`));
    }
    if (report.content.nextSteps.length > 0) {
      lines.push('');
      lines.push('## 下一步计划');
      report.content.nextSteps.forEach(item => lines.push(`- ${item}`));
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2 }}>汇报</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>AI 自动生成日报、周报、月报、季度报、年报</div>
        </div>
        <button style={{
          height: 36,
          padding: '0 16px',
          borderRadius: 8,
          background: 'var(--ink)',
          color: 'var(--canvas)',
          border: 'none',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'opacity 150ms',
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          AI 生成汇报
        </button>
      </div>

      {/* Filters and navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: '全部' },
            { key: 'daily', label: '日报' },
            { key: 'weekly', label: '周报' },
            { key: 'monthly', label: '月报' },
            { key: 'quarterly', label: '季度报' },
            { key: 'yearly', label: '年报' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key as any)}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 500,
                border: '1px solid var(--border-subtle)',
                borderRadius: 20,
                background: filter === item.key ? 'var(--ink)' : 'transparent',
                cursor: 'pointer',
                color: filter === item.key ? 'var(--canvas)' : 'var(--ink-3)',
                transition: 'all 150ms',
                fontFamily: "'Geist', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (filter !== item.key) {
                  e.currentTarget.style.background = 'var(--surface-raised)';
                  e.currentTarget.style.color = 'var(--ink-2)';
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== item.key) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--ink-3)';
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handlePrevMonth}
            style={{
              width: 28,
              height: 28,
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-2)',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-raised)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'Geist Mono', monospace",
            minWidth: 100,
            textAlign: 'center',
          }}>
            {year}年{monthNames[month]}
          </div>
          <button
            onClick={handleNextMonth}
            style={{
              width: 28,
              height: 28,
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-2)',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-raised)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--surface)',
        marginTop: 16,
      }}>
        {cells}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        {[
          { type: 'daily', label: '日报' },
          { type: 'weekly', label: '周报' },
          { type: 'monthly', label: '月报' },
          { type: 'quarterly', label: '季度报' },
          { type: 'yearly', label: '年报' },
        ].map(item => (
          <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--ink-3)' }}>
            <span style={{
              width: item.type === 'yearly' ? 8 : 6,
              height: item.type === 'yearly' ? 8 : 6,
              borderRadius: '50%',
              background: typeColors[item.type].dot,
            }} />
            {item.label}
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-3)' }}>
          所有汇报均由 AI 自动生成
        </span>
      </div>
      {/* Report detail drawer */}
      {viewingReport && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--overlay)',
              backdropFilter: 'blur(4px)',
              zIndex: 998,
            }}
            onClick={() => setViewingReport(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 480,
              background: 'var(--surface)',
              boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drawer header */}
            <div style={{
              height: 56,
              padding: '0 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: typeColors[viewingReport.type].bg,
                  color: typeColors[viewingReport.type].text,
                }}>
                  {typeLabels[viewingReport.type]}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {viewingReport.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => handleCopyReport(viewingReport)}
                  style={{
                    width: 28,
                    height: 28,
                    border: 'none',
                    borderRadius: 6,
                    background: copied ? 'rgba(16,185,129,0.1)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: copied ? 'var(--green)' : 'var(--ink-3)',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    if (!copied) {
                      e.currentTarget.style.background = 'var(--surface-raised)';
                      e.currentTarget.style.color = 'var(--ink)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!copied) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--ink-3)';
                    }
                  }}
                  title="复制内容"
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setViewingReport(null)}
                style={{
                  width: 28,
                  height: 28,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-3)',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-raised)';
                  e.currentTarget.style.color = 'var(--ink)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--ink-3)';
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              </div>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Date */}
              <div style={{
                fontSize: 12,
                color: 'var(--ink-3)',
                fontFamily: "'Geist Mono', monospace",
              }}>
                {formatDate(viewingReport.date)}
              </div>

              {/* Summary */}
              <div style={{
                padding: 16,
                background: 'var(--canvas)',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '0.04em' }}>
                  概要
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.6 }}>
                  {viewingReport.content.summary || '暂无概要'}
                </div>
              </div>

              {/* Completed */}
              {viewingReport.content.completed.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 10, letterSpacing: '0.04em' }}>
                    已完成
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {viewingReport.content.completed.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--ink-1)',
                        lineHeight: 1.5,
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 3 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {viewingReport.content.issues.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 10, letterSpacing: '0.04em' }}>
                    问题与风险
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {viewingReport.content.issues.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--ink-1)',
                        lineHeight: 1.5,
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 3 }}>
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next steps */}
              {viewingReport.content.nextSteps.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 10, letterSpacing: '0.04em' }}>
                    下一步计划
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {viewingReport.content.nextSteps.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--ink-1)',
                        lineHeight: 1.5,
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 3 }}>
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <polyline points="19 12 12 19 5 12"/>
                        </svg>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
