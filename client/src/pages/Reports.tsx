import { useState, useRef, useEffect } from 'react';
import { useReports } from '../hooks/useReports';
import { useProjectContext } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { reportsApi } from '../services/api';
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

const CN_NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

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

function formatReportAsTxt(report: Report, projectName: string): string {
  const y = getYearInTZ(report.date);
  const m = getMonthInTZ(report.date);
  const d = getDayInTZ(report.date);

  let title: string;
  if (report.type === 'daily') {
    title = `${projectName} ${y}年${m}月${d}日 工作日报`;
  } else if (report.type === 'weekly') {
    const weekNum = Math.ceil(d / 7);
    title = `${projectName} ${y}年${m}月第${weekNum}周 工作周报`;
  } else if (report.type === 'monthly') {
    title = `${projectName} ${y}年${m}月 工作月报`;
  } else if (report.type === 'yearly') {
    title = `${projectName} ${y}年 工作年报`;
  } else {
    title = report.label;
  }

  const lines: string[] = [title, ''];

  if (report.content.completed.length > 0) {
    lines.push(report.type === 'daily' ? '【今日完成】' : '【已完成】');
    report.content.completed.forEach((item, idx) => {
      lines.push(`（${CN_NUMS[idx + 1] || String(idx + 1)}）${item}`);
    });
    lines.push('');
  }

  if (report.content.issues.length > 0) {
    lines.push('【存在问题】');
    report.content.issues.forEach((item, idx) => {
      lines.push(`（${CN_NUMS[idx + 1] || String(idx + 1)}）${item}`);
    });
    lines.push('');
  }

  if (report.content.nextSteps.length > 0) {
    lines.push(report.type === 'daily' ? '【明日计划】' : '【下一步计划】');
    report.content.nextSteps.forEach((item, idx) => {
      lines.push(`（${CN_NUMS[idx + 1] || String(idx + 1)}）${item}`);
    });
  }

  if (report.content.summary) {
    lines.push('');
    lines.push('【概要】');
    lines.push(report.content.summary);
  }

  return lines.join('\n');
}

export function Reports() {
  const { selectedProjectId, projects } = useProjectContext();
  const { user } = useAuth();
  const { addToast } = useToast();
  const isViewer = user?.role === 'viewer';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('all');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const projectName = projects.find(p => p.id === selectedProjectId)?.name || '';

  const { reports: rawReports, refetch } = useReports({
    projectId: selectedProjectId ?? undefined,
    year,
    month: month + 1,
  });

  const reportData: Report[] = rawReports.map(parseReport).filter((r): r is Report => r !== null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  const totalDays = lastDay.getDate();
  const prevLast = new Date(year, month, 0).getDate();

  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const monthReports = reportData.filter(r => {
    return getYearInTZ(r.date) === year && getMonthInTZ(r.date) === month + 1;
  });

  const filtered = filter === 'all' ? monthReports : monthReports.filter(r => r.type === filter);

  const itemMap: Record<number, Report[]> = {};
  filtered.forEach(r => {
    const day = getDayInTZ(r.date);
    if (getYearInTZ(r.date) === year && getMonthInTZ(r.date) === month + 1) {
      if (!itemMap[day]) itemMap[day] = [];
      itemMap[day].push(r);
    }
  });

  const handleGenerate = async (type: 'daily' | 'weekly' | 'monthly') => {
    if (!selectedProjectId) return;
    setGenerating(true);
    setShowDropdown(false);
    try {
      const res = await reportsApi.generate({ type, projectId: selectedProjectId });
      const raw = res.data;
      const parsed = parseReport(raw);
      await refetch();
      if (parsed) {
        if (type === 'daily') {
          setCurrentDate(new Date());
        }
        setViewingReport(parsed);
      }
    } catch (err: any) {
      addToast(err?.message || '生成日报失败', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateWeekly = async (weekStart: Date) => {
    if (!selectedProjectId) return;
    setGenerating(true);
    setShowWeekPicker(false);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const res = await reportsApi.generate({
        type: 'weekly',
        projectId: selectedProjectId,
        weekStart: weekStart.toISOString(),
      });
      const raw = res.data;
      const parsed = parseReport(raw);
      setCurrentDate(new Date(weekEnd.getFullYear(), weekEnd.getMonth(), 1));
      await refetch();
      if (parsed) setViewingReport(parsed);
    } catch (err: any) {
      addToast(err?.message || '生成周报失败', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMonthly = async (targetYear: number, targetMonth: number) => {
    if (!selectedProjectId) return;
    setGenerating(true);
    setShowMonthPicker(false);
    try {
      const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
      const dateStr = new Date(targetYear, targetMonth - 1, lastDayOfMonth).toISOString();
      const res = await reportsApi.generate({
        type: 'monthly',
        projectId: selectedProjectId,
        date: dateStr,
      });
      const raw = res.data;
      const parsed = parseReport(raw);
      setCurrentDate(new Date(targetYear, targetMonth - 1, 1));
      await refetch();
      if (parsed) setViewingReport(parsed);
    } catch (err: any) {
      addToast(err?.message || '生成月报失败', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyReport = (report: Report) => {
    const txt = formatReportAsTxt(report, projectName);
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Week picker: show 4 weeks of current month
  const weeks: { start: Date; end: Date; label: string }[] = [];
  for (let d = 1; d <= totalDays; d += 7) {
    const weekStart = new Date(year, month, d);
    const weekEnd = new Date(year, month, Math.min(d + 6, totalDays));
    weeks.push({
      start: weekStart,
      end: weekEnd,
      label: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
    });
  }

  // Month picker: show 12 months of current year
  const monthPickerItems = Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    label: `${i + 1}月`,
  }));

  // Calendar cells
  const cells: React.ReactNode[] = [];

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

  for (let i = 1; i < startDow; i++) {
    cells.push(
      <div key={`prev-${i}`} style={{
        minHeight: 100,
        padding: '6px 8px',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        opacity: 0.25,
      }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", padding: '1px 3px' }}>
          {prevLast - startDow + 1 + i}
        </div>
      </div>
    );
  }

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
          fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
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
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", padding: '1px 3px' }}>
            {i}
          </div>
        </div>
      );
    }
  }

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2 }}>汇报</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>自动生成日报、周报、月报、年报</div>
        </div>
        {!isViewer && (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={generating || !selectedProjectId}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              background: 'var(--ink)',
              color: 'var(--canvas)',
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: generating || !selectedProjectId ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'opacity 150ms',
              opacity: generating || !selectedProjectId ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { if (!generating) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { if (!generating) e.currentTarget.style.opacity = selectedProjectId ? '1' : '0.6'; }}
          >
            {generating ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            )}
            {generating ? '生成中...' : '生成汇报'}
          </button>
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              zIndex: 100,
              minWidth: 140,
            }}>
              <button
                onClick={() => handleGenerate('daily')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--ink-1)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                日报
              </button>
              <button
                onClick={() => { setShowDropdown(false); setShowWeekPicker(true); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--ink-1)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                周报
              </button>
              <button
                onClick={() => { setShowDropdown(false); setShowMonthPicker(true); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--ink-1)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                月报
              </button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Week picker modal */}
      {showWeekPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 998 }} onClick={() => setShowWeekPicker(false)} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--surface)',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 999,
            minWidth: 280,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>选择周</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>{year}年{month + 1}月</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {weeks.map((w, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGenerateWeekly(w.start)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 6,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--ink-1)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  第{idx + 1}周 ({w.label})
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Month picker modal */}
      {showMonthPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 998 }} onClick={() => setShowMonthPicker(false)} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--surface)',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 999,
            minWidth: 280,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>选择月份</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>{year}年</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {monthPickerItems.map((item) => (
                <button
                  key={item.month}
                  onClick={() => handleGenerateMonthly(item.year, item.month)}
                  style={{
                    padding: '8px 4px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 6,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--ink-1)',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Filters and navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: '全部' },
            { key: 'daily', label: '日报' },
            { key: 'weekly', label: '周报' },
            { key: 'monthly', label: '月报' },
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
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
            fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
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
          所有汇报均由自动生成
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
                  title="复制为文本"
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
                fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
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
