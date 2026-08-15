import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../services/api';
import { useProjectContext } from '../../contexts/ProjectContext';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  tasks: Array<{ id: string; title: string; type: string; status: string; column: string; projectId: string; project: { name: string } }>;
  artifacts: Array<{ id: string; name: string; type: string; status: string; projectId: string; project: { name: string } }>;
  templates: Array<{ id: string; name: string; category: string; description: string | null; fileType: string }>;
}

const navItems = [
  { label: '工作台', page: '/workbench' },
  { label: '项目', page: '/projects' },
  { label: '产物中心', page: '/artifacts' },
  { label: '文档模板', page: '/templates' },
  { label: '汇报', page: '/reports' },
];

const actionItems = [
  { label: '新建任务', action: 'newTask' },
  { label: '新建项目', action: 'newProj' },
];

const typeLabels: Record<string, string> = {
  requirement: '需求', prototype: '原型', design: '设计', development: '开发',
  testing: '测试', document: '文档', review: '评审', risk: '风险',
  research: '调研', deploy: '部署',
};

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { selectProject } = useProjectContext();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.search(query.trim());
        setResults(res.data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const handleNavClick = (page: string) => {
    onClose();
    navigate(page);
  };

  const handleActionClick = (action: string) => {
    onClose();
    if (action === 'newTask') window.dispatchEvent(new CustomEvent('openNewTaskDrawer'));
    else if (action === 'newProj') window.dispatchEvent(new CustomEvent('openNewProjectDrawer'));
  };

  const handleTaskClick = (task: SearchResult['tasks'][0]) => {
    selectProject(task.projectId);
    onClose();
    navigate(`/projects?task=${task.id}`);
  };

  const handleArtifactClick = (artifact: SearchResult['artifacts'][0]) => {
    selectProject(artifact.projectId);
    onClose();
    navigate(`/artifacts?artifact=${artifact.id}`);
  };

  const handleTemplateClick = () => {
    onClose();
    navigate('/templates');
  };

  if (!isOpen) return null;

  const hasQuery = query.trim().length > 0;
  const hasResults = results && (results.tasks.length > 0 || results.artifacts.length > 0 || results.templates.length > 0);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay)',
          zIndex: 998,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '20vh',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 640,
            background: 'var(--surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Input */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, marginLeft: 18, flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索任务、产物、模板..."
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
              style={{
                width: '100%',
                height: 52,
                border: 'none',
                outline: 'none',
                padding: '0 20px 0 10px',
                fontFamily: "'Geist', sans-serif",
                fontSize: 15,
                color: 'var(--ink)',
                background: 'transparent',
              }}
            />
          </div>

          {/* Results */}
          <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8 }}>
            {!hasQuery && (
              <>
                <SectionLabel>导航</SectionLabel>
                {navItems.map((item) => (
                  <NavItem key={item.page} onClick={() => handleNavClick(item.page)}>
                    {item.label}
                  </NavItem>
                ))}
                <SectionLabel>操作</SectionLabel>
                {actionItems.map((item) => (
                  <NavItem key={item.action} onClick={() => handleActionClick(item.action)}>
                    {item.label}
                  </NavItem>
                ))}
              </>
            )}

            {hasQuery && loading && (
              <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
                搜索中...
              </div>
            )}

            {hasQuery && !loading && results && (
              <>
                {results.tasks.length > 0 && (
                  <>
                    <SectionLabel>任务</SectionLabel>
                    {results.tasks.map((task) => (
                      <ResultItem key={task.id} onClick={() => handleTaskClick(task)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{task.project.name}{typeLabels[task.type] ? ` · ${typeLabels[task.type]}` : ''}</div>
                        </div>
                        <StatusBadge text={task.column === 'done' ? '已完成' : '进行中'} done={task.column === 'done'} />
                      </ResultItem>
                    ))}
                  </>
                )}

                {results.artifacts.length > 0 && (
                  <>
                    <SectionLabel>产物</SectionLabel>
                    {results.artifacts.map((art) => (
                      <ResultItem key={art.id} onClick={() => handleArtifactClick(art)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{art.project.name} · {art.type}</div>
                        </div>
                      </ResultItem>
                    ))}
                  </>
                )}

                {results.templates.length > 0 && (
                  <>
                    <SectionLabel>模板</SectionLabel>
                    {results.templates.map((tpl) => (
                      <ResultItem key={tpl.id} onClick={handleTemplateClick}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{tpl.category}{tpl.description ? ` · ${tpl.description}` : ''}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Geist Mono', monospace", color: 'var(--ink-2)', padding: '1px 6px', background: 'var(--surface-raised)', borderRadius: 3 }}>{tpl.fileType.toUpperCase()}</span>
                      </ResultItem>
                    ))}
                  </>
                )}

                {!hasResults && (
                  <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
                    未找到匹配结果
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--ink-3)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      padding: '10px 12px 4px',
    }}>
      {children}
    </div>
  );
}

function NavItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'background 150ms',
        fontSize: 13,
        color: 'var(--ink-2)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-overlay)'; e.currentTarget.style.color = 'var(--ink)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)'; }}
    >
      {children}
    </div>
  );
}

function ResultItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-overlay)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ text, done }: { text: string; done: boolean }) {
  return (
    <span style={{
      fontSize: 10,
      color: done ? 'var(--ink-3)' : 'var(--canvas)',
      background: done ? 'var(--surface-raised)' : 'var(--ink)',
      padding: '2px 8px',
      borderRadius: 4,
      flexShrink: 0,
    }}>
      {text}
    </span>
  );
}
