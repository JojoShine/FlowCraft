import { useState, useEffect, useRef } from 'react';
import { SearchDialog } from '../ui/SearchDialog';
import { useAuth } from '../../contexts/AuthContext';
import { tasksApi } from '../../services/api';
import { useProjectContext } from '../../contexts/ProjectContext';
import type { Task } from '../../types';

interface TopbarProps {
  title: string;
  onAiToggle?: () => void;
  aiOpen?: boolean;
}

export function Topbar({ title, onAiToggle, aiOpen }: TopbarProps) {
  const { user, logout } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const { selectedProjectId } = useProjectContext();

  useEffect(() => {
    const fetchOverdue = async () => {
      try {
        const params: { projectId?: string } = {};
        if (selectedProjectId) params.projectId = selectedProjectId;
        const res = await tasksApi.list(params);
        const allTasks = (res.data as any[]) || [];
        const now = new Date();
        const overdue = allTasks.filter((t: any) => {
          if (t.column === 'done') return false;
          if (!t.dueDate) return false;
          const dueEnd = new Date(t.dueDate);
          dueEnd.setHours(23, 59, 59, 999);
          return dueEnd < now;
        });
        overdue.sort((a: any, b: any) => {
          const aEnd = new Date(a.dueDate); aEnd.setHours(23, 59, 59, 999);
          const bEnd = new Date(b.dueDate); bEnd.setHours(23, 59, 59, 999);
          return aEnd.getTime() - bEnd.getTime();
        });
        setOverdueTasks(overdue);
      } catch {
        setOverdueTasks([]);
      }
    };
    fetchOverdue();
  }, [selectedProjectId]);

  useEffect(() => {
    if (!showNotif) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotif]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header style={{
      height: 56,
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 24px',
      background: 'var(--surface)',
    }}>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Search button */}
        <button
          onClick={() => setShowSearch(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: '0 12px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            background: 'var(--canvas)',
            fontSize: 12,
            color: 'var(--ink-3)',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-raised)';
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--canvas)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          搜索项目、产物、任务...
          <kbd style={{
            marginLeft: 4,
            padding: '2px 4px',
            fontSize: 10,
            fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
          }}>⌘K</kbd>
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              borderRadius: 8,
              background: showNotif ? 'var(--surface-raised)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => {
              if (!showNotif) e.currentTarget.style.background = 'var(--surface-raised)';
            }}
            onMouseLeave={(e) => {
              if (!showNotif) e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: overdueTasks.length > 0 ? 'var(--ink)' : 'var(--ink-2)' }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {overdueTasks.length > 0 && (
              <span style={{
                position: 'absolute',
                top: 5,
                right: 4,
                minWidth: 14,
                height: 14,
                borderRadius: 7,
                background: 'var(--red, #e53e3e)',
                border: '1.5px solid var(--surface)',
                fontSize: 9,
                fontWeight: 600,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}>
                {overdueTasks.length > 99 ? '99+' : overdueTasks.length}
              </span>
            )}
          </button>

          {/* Notification panel */}
          {showNotif && (
            <div style={{
              position: 'absolute',
              top: 40,
              right: 0,
              width: 340,
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
              zIndex: 100,
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>通知</span>
                {overdueTasks.length > 0 && (
                  <span style={{
                    fontSize: 10,
                    color: 'var(--red, #e53e3e)',
                    fontWeight: 500,
                  }}>
                    {overdueTasks.length} 项任务已延期
                  </span>
                )}
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {overdueTasks.length === 0 ? (
                  <div style={{
                    padding: '40px 16px 36px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--surface-raised)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: 'var(--ink-3)', opacity: 0.5 }}>
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
                      一切正常
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                      当前没有延期的任务
                    </div>
                  </div>
                ) : (
                  overdueTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < overdueTasks.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--red, #e53e3e)',
                          flexShrink: 0,
                          marginTop: 5,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, lineHeight: 1.4 }}>
                            任务「{task.title}」已延期
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>截止: {formatDate(task.dueDate)}</span>
                            {task.phase && <span>{task.phase.name}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI toggle */}
        <button
          onClick={onAiToggle}
          style={{
            width: 32,
            height: 32,
            border: aiOpen ? '1px solid var(--border-default)' : 'none',
            borderRadius: 8,
            background: aiOpen ? 'var(--surface-raised)' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            if (!aiOpen) e.currentTarget.style.background = 'var(--surface-raised)';
          }}
          onMouseLeave={(e) => {
            if (!aiOpen) e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: aiOpen ? 'var(--ink)' : 'var(--ink-2)' }}>
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </button>

        {/* User menu */}
        {user && (
          <div style={{ position: 'relative', marginLeft: 8 }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                border: 'none',
                borderRadius: 8,
                background: showUserMenu ? 'var(--surface-raised)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => {
                if (!showUserMenu) e.currentTarget.style.background = 'var(--surface-raised)';
              }}
              onMouseLeave={(e) => {
                if (!showUserMenu) e.currentTarget.style.background = 'transparent';
              }}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name || ''} style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }} />
              ) : (
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--ink-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--surface)',
                }}>
                  {(user.name || '?')[0].toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 13, color: 'var(--ink)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name || '用户'}
              </span>
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: 40,
                right: 0,
                width: 160,
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
                zIndex: 100,
                padding: '4px',
              }}>
                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 8,
                    background: 'transparent',
                    fontSize: 13,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <SearchDialog isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </header>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${mins}`;
}
