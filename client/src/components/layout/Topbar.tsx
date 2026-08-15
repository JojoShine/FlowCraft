import { useState, useEffect } from 'react';
import { SearchDialog } from '../ui/SearchDialog';

interface TopbarProps {
  title: string;
  onAiToggle?: () => void;
  aiOpen?: boolean;
}

export function Topbar({ title, onAiToggle, aiOpen }: TopbarProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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
            fontFamily: "'Geist Mono', monospace",
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
          }}>⌘K</kbd>
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--ink-2)' }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {/* Notification dot */}
            <span style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--ink)',
              border: '1.5px solid var(--surface)',
            }} />
          </button>

          {/* Notification panel */}
          {showNotif && (
            <div style={{
              position: 'absolute',
              top: 40,
              right: 0,
              width: 320,
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
              zIndex: 100,
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: 13,
                fontWeight: 600,
              }}>
                通知
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: 12, marginBottom: 4 }}>「异地就医申请流程图」待确认事项已更新</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>10 分钟前</div>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: 12, marginBottom: 4 }}>实施方案 v2.1 已被确认</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>2 小时前</div>
                </div>
                <div style={{ padding: '12px 16px', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: 12, marginBottom: 4 }}>任务「完成原型设计」即将到期</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>今日 09:00</div>
                </div>
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
      </div>

      <SearchDialog isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </header>
  );
}
