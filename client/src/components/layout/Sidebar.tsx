import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useArtifacts } from '../../hooks/useArtifacts';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useTheme } from '../../contexts/ThemeContext';
import { tasksApi } from '../../services/api';
import { onDataChange } from '../../utils/dataEvents';
import { ProjectDrawer } from '../ui/ProjectDrawer';
import logoSvg from '../../assets/logo.svg';

const statusLabels: Record<string, string> = {
  planning: '方案设计',
  design: '原型设计',
  development: '开发实施',
  testing: '测试验收',
  completed: '已完成',
};

const navItems = [
  { path: '/workbench', label: '工作台', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>
  )},
  { path: '/kanban', label: '任务看板', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10"/>
      <path d="M18 20V4"/>
      <path d="M6 20v-4"/>
    </svg>
  )},
  { path: '/projects', label: '项目', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20"/>
      <path d="M5 20V8l7-5 7 5v12"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  )},
  { path: '/artifacts', label: '产物', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <path d="M12 11h4"/>
      <path d="M12 16h4"/>
    </svg>
  )},
];

const toolItems = [
  { path: '/templates', label: '文档模板', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )},
  { path: '/reports', label: '汇报', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M9 15l2 2 4-4"/>
    </svg>
  )},
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedProjectId, selectProject, projects } = useProjectContext();
  const [taskCount, setTaskCount] = useState(0);
  const { total: artifactsTotal } = useArtifacts(selectedProjectId ?? undefined, undefined, 1, 1);
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNewProjectDrawer, setShowNewProjectDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (!selectedProjectId) { setTaskCount(0); return; }
    tasksApi.count(selectedProjectId).then(res => {
      setTaskCount(res.data.total);
    }).catch(() => setTaskCount(0));
    return onDataChange((type) => {
      if (type === 'tasks') {
        tasksApi.count(selectedProjectId).then(res => setTaskCount(res.data.total)).catch(() => {});
      }
    });
  }, [selectedProjectId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [dropdownOpen]);

  const filteredProjects = searchQuery.trim()
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : projects;

  const handleSelectProject = (id: string) => {
    selectProject(id);
    setDropdownOpen(false);
    navigate('/projects');
  };


  return (
    <aside style={{
      width: 240,
      height: '100dvh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        height: 56,
        padding: '0 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
      }}>
        <img src={logoSvg} alt="FlowCraft" style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)' }}>FlowCraft</span>
          <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: "'Geist Mono', monospace", letterSpacing: '0.02em', marginTop: 2 }}>Project Workbench</span>
        </div>
        <button
          onClick={toggleTheme}
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
          title={theme === 'light' ? '切换到暗黑模式' : '切换到浅色模式'}
        >
          {theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {/* Workspace group */}
        <div style={{ marginBottom: 4 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '10px 10px 6px',
          }}>
            工作区
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 8,
                  color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? 'var(--surface-raised)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 150ms',
                  position: 'relative',
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.55, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </span>
                {item.label}
                {item.path === '/kanban' && taskCount > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    fontWeight: 500,
                  }}>
                    {taskCount}
                  </span>
                )}
                {item.path === '/artifacts' && artifactsTotal > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    fontWeight: 500,
                  }}>
                    {artifactsTotal}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Tools group */}
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '10px 10px 6px',
          }}>
            工具
          </div>
          {toolItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 8,
                  color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? 'var(--surface-raised)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 150ms',
                  position: 'relative',
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.55, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer - Project switcher */}
      <div style={{ padding: 8, borderTop: '1px solid var(--border-subtle)', position: 'relative' }} ref={dropdownRef}>
        {/* Dropdown panel */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 8,
            right: 8,
            marginBottom: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
            maxHeight: 320,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 200,
          }}>
            <div style={{
              padding: '10px 12px 6px',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
            }}>
              切换项目
            </div>
            <div style={{ padding: '0 8px 6px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 8px',
                height: 30,
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: 'var(--canvas)',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, color: 'var(--ink-3)', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索项目..."
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 12,
                    color: 'var(--ink)',
                    fontFamily: "'Geist', sans-serif",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSearchQuery(''); searchInputRef.current?.focus(); }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--ink-3)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 6px', scrollbarWidth: 'none' }} className="hide-scrollbar">
              {filteredProjects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProject(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'background 150ms',
                      background: isSelected ? 'var(--surface-raised)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--canvas)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: isSelected ? 'var(--ink)' : 'var(--surface-sunken)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: isSelected ? 'var(--canvas)' : 'var(--ink-2)',
                      flexShrink: 0,
                    }}>
                      {p.name.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 500 : 400,
                        color: isSelected ? 'var(--ink)' : 'var(--ink-2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {statusLabels[p.status || ''] || p.status || '未开始'}
                      </div>
                    </div>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                );
              })}
              {filteredProjects.length === 0 && (
                <div style={{ padding: '12px 8px', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
                  {searchQuery ? '没有匹配的项目' : '暂无项目'}
                </div>
              )}
            </div>
            <div style={{
              padding: '6px',
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setShowNewProjectDrawer(true);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                新建项目
              </button>
            </div>
          </div>
        )}

        {/* Current project trigger */}
        <div
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 150ms',
            background: dropdownOpen ? 'var(--surface-raised)' : 'transparent',
          }}
          onMouseEnter={(e) => { if (!dropdownOpen) e.currentTarget.style.background = 'var(--canvas)'; }}
          onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: selectedProject ? 'var(--ink)' : 'var(--surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: selectedProject ? 'var(--canvas)' : 'var(--ink-2)',
            flexShrink: 0,
          }}>
            {selectedProject ? selectedProject.name.slice(0, 2) : '--'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {selectedProject ? selectedProject.name : '未选择项目'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {selectedProject ? (statusLabels[selectedProject.status || ''] || '未开始') : '点击选择项目'}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
            color: 'var(--ink-3)',
            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms',
          }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Project Drawer */}
      <ProjectDrawer
        isOpen={showNewProjectDrawer}
        onClose={() => setShowNewProjectDrawer(false)}
      />
    </aside>
  );
}
