import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useArtifacts } from '../hooks/useArtifacts';
import { useProjectContext } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { ArtifactGrid } from '../components/artifacts/ArtifactGrid';
import { ArtifactsCalendar } from '../components/artifacts/ArtifactsCalendar';
import { ArtifactDialog } from '../components/ui/ArtifactDialog';
import { ArtifactViewer } from '../components/ui/ArtifactViewer';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { artifactsApi, tasksApi } from '../services/api';
import { notifyDataChange } from '../utils/dataEvents';
import { formatDate } from '../utils/date';

const pageSize = 12;

export function Artifacts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterId = searchParams.get('artifact');
  const urlKeyword = searchParams.get('keyword') || '';
  const [resolvedKeyword, setResolvedKeyword] = useState(urlKeyword);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [showNewArtifactDialog, setShowNewArtifactDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [viewingArtifact, setViewingArtifact] = useState<any>(null);
  const [bindTarget, setBindTarget] = useState<any>(null);
  const [bindTasks, setBindTasks] = useState<{ id: string; title: string }[]>([]);
  const [bindSelected, setBindSelected] = useState('');
  const [bindSearch, setBindSearch] = useState('');
  const [bindOpen, setBindOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const bindRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const confirm = useConfirm();
  const { selectedProjectId, projects, projectsLoading } = useProjectContext();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const isCalendar = viewMode === 'calendar';
  const keyword = resolvedKeyword || urlKeyword;
  const { artifacts, total, initialLoading, error, refetch } = useArtifacts(selectedProjectId ?? undefined, undefined, keyword || undefined, page, isCalendar ? 9999 : pageSize);

  useEffect(() => {
    if (filterId) {
      artifactsApi.get(filterId).then(res => {
        setResolvedKeyword(res.data.name);
        setSearchParams({ keyword: res.data.name }, { replace: true });
      }).catch(() => {});
    }
  }, [filterId]);

  useEffect(() => {
    setResolvedKeyword(urlKeyword);
  }, [urlKeyword]);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const clearKeyword = () => {
    setSearchParams({});
    setResolvedKeyword('');
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDeleteArtifact = async (artifact: any) => {
    const ok = await confirm({
      title: '删除产物',
      description: `确认删除产物「${artifact.name}」？此操作不可撤销。`,
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await artifactsApi.delete(artifact.id);
      toast({ title: '产物已删除', variant: 'success' });
      refetch();
      notifyDataChange('artifacts');
    } catch (err: any) {
      toast({ title: '删除失败', description: err?.message, variant: 'error' });
    }
  };

  const handleOpenBindTask = async (artifact: any) => {
    setBindTarget(artifact);
    setBindSelected(artifact.taskId || '');
    if (selectedProjectId) {
      try {
        const res = await tasksApi.listOptions(selectedProjectId);
        const list = (res.data as any[]) || [];
        setBindTasks(list.map((t: any) => ({ id: t.id, title: t.title })));
      } catch {
        setBindTasks([]);
      }
    }
  };

  const handleBindTask = async () => {
    if (!bindTarget) return;
    try {
      await artifactsApi.update(bindTarget.id, { taskId: bindSelected || null });
      toast({ title: bindSelected ? '已绑定任务' : '已解除绑定', variant: 'success' });
      setBindTarget(null);
      refetch();
      notifyDataChange('artifacts');
    } catch (err: any) {
      toast({ title: '操作失败', description: err?.message, variant: 'error' });
    }
  };

  useEffect(() => {
    setBindSearch('');
    setBindOpen(false);
  }, [bindTarget]);

  useEffect(() => {
    if (!bindOpen) return;
    const handler = (e: MouseEvent) => {
      if (bindRef.current && !bindRef.current.contains(e.target as Node)) {
        setBindOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bindOpen]);

  const filteredBindTasks = bindTasks.filter(t =>
    !bindSearch || t.title.toLowerCase().includes(bindSearch.toLowerCase())
  );
  const selectedTaskTitle = bindTasks.find(t => t.id === bindSelected)?.title;

  if (initialLoading || projectsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="暂无项目"
        description="在左侧栏创建一个项目开始使用"
      />
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--red)' }}>加载失败: {error}</div>
      </div>
    );
  }

  // Transform artifacts for display
  const allTransformed = artifacts.map(a => {
    const rawDate = a.createdAt || a.updatedAt;
    return {
      id: a.id,
      name: a.name,
      type: (a.type || 'file') as 'file' | 'folder',
      updatedAt: (() => {
        if (!rawDate) return '';
        return formatDate(rawDate);
      })(),
      _rawDate: rawDate || undefined,
      owner: a.creatorId || '',
      taskName: a.task?.title || undefined,
      taskId: a.taskId || undefined,
      size: undefined,
    };
  });

  const transformedArtifacts = allTransformed;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2 }}>产物中心</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>所有产物均关联任务，产物驱动开发流程</div>
          <div style={{
            display: 'inline-flex',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            overflow: 'hidden',
            marginTop: 6,
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                height: 28,
                padding: '0 12px',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--ink)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--canvas)' : 'var(--ink-3)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              卡片
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                height: 28,
                padding: '0 12px',
                border: 'none',
                background: viewMode === 'calendar' ? 'var(--ink)' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--canvas)' : 'var(--ink-3)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              日历
            </button>
          </div>
        </div>
        {!isViewer && (
        <button
          onClick={() => setShowNewArtifactDialog(true)}
          style={{
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建产物
        </button>
        )}
      </div>

      {/* Keyword filter banner */}
      {keyword && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '8px 14px', borderRadius: 8,
          background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)',
          fontSize: 13, color: 'var(--ink-2)',
        }}>
          <span>筛选：<strong style={{ color: 'var(--ink)' }}>{keyword}</strong></span>
          <span style={{ color: 'var(--ink-4)' }}>共 {total} 条结果</span>
          <button
            onClick={clearKeyword}
            style={{
              marginLeft: 'auto', height: 26, padding: '0 10px', borderRadius: 6,
              border: '1px solid var(--border-default)', background: 'transparent',
              fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            清除筛选
          </button>
        </div>
      )}

      {/* Artifact grid or calendar */}
      {viewMode === 'grid' ? (
        <ArtifactGrid artifacts={transformedArtifacts} onArtifactClick={(a) => {
          const full = artifacts.find(ar => ar.id === a.id);
          if (full) setViewingArtifact({ id: full.id, name: full.name, type: full.type, filePath: full.filePath, content: full.content, shareToken: full.shareToken });
          else setViewingArtifact({ id: a.id, name: a.name, type: a.type });
        }} onDelete={isViewer ? undefined : handleDeleteArtifact} onBindTask={isViewer ? undefined : handleOpenBindTask} />
      ) : (
        <ArtifactsCalendar artifacts={transformedArtifacts} />
      )}

      {/* Pagination - grid view only */}
      {viewMode === 'grid' && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          totalLabel="个产物"
          onChange={setPage}
        />
      )}

      {/* Artifact Dialog */}
      <ArtifactDialog
        isOpen={showNewArtifactDialog}
        onClose={() => setShowNewArtifactDialog(false)}
        projectId={selectedProjectId ?? undefined}
      />

      <ArtifactViewer
        isOpen={!!viewingArtifact}
        artifact={viewingArtifact}
        onClose={() => setViewingArtifact(null)}
      />

      {/* Bind Task Dialog */}
      {bindTarget && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0, background: 'var(--overlay)',
              backdropFilter: 'blur(4px)', zIndex: 998,
            }}
            onClick={() => setBindTarget(null)}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--surface)', borderRadius: 12, zIndex: 999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 380, overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>绑定任务</h3>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                为产物「{bindTarget.name}」选择关联任务
              </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div ref={bindRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => {
                    if (bindRef.current) {
                      const rect = bindRef.current.getBoundingClientRect();
                      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                    }
                    setBindOpen(true);
                  }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 12px', border: '1px solid var(--border-default)',
                    borderRadius: 8, fontSize: 13, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: bindOpen ? 'var(--ink)' : (selectedTaskTitle ? 'var(--ink)' : 'var(--ink-3)'),
                    background: 'var(--surface)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    minHeight: 36,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bindOpen ? '' : (selectedTaskTitle || '选择任务')}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: 'var(--ink-3)', flexShrink: 0, transform: bindOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {bindOpen && createPortal(
                  <div style={{
                    position: 'fixed', top: dropdownPos.top, left: dropdownPos.left,
                    width: dropdownPos.width, background: 'var(--surface)',
                    border: '1px solid var(--border-default)', borderRadius: 8,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 1001,
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '8px 8px 4px' }}>
                      <input
                        autoFocus
                        value={bindSearch}
                        onChange={(e) => setBindSearch(e.target.value)}
                        placeholder="搜索任务..."
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '6px 10px', border: '1px solid var(--border-subtle)',
                          borderRadius: 6, fontSize: 12, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          color: 'var(--ink)', background: 'var(--surface-raised)',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ maxHeight: 180, overflowY: 'auto', padding: '4px' }}>
                      <div
                        onClick={() => { setBindSelected(''); setBindOpen(false); setBindSearch(''); }}
                        style={{
                          padding: '7px 10px', borderRadius: 6, fontSize: 13,
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", cursor: 'pointer',
                          color: !bindSelected ? 'var(--ink)' : 'var(--ink-2)',
                          background: !bindSelected ? 'var(--surface-raised)' : 'transparent',
                          fontWeight: !bindSelected ? 500 : 400,
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)'; }}
                        onMouseLeave={(e) => { if (bindSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        不绑定任务
                      </div>
                      {filteredBindTasks.length === 0 ? (
                        <div style={{ padding: '12px 10px', fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>
                          无匹配任务
                        </div>
                      ) : (
                        filteredBindTasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => { setBindSelected(t.id); setBindOpen(false); setBindSearch(''); }}
                            style={{
                              padding: '7px 10px', borderRadius: 6, fontSize: 13,
                              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", cursor: 'pointer',
                              color: t.id === bindSelected ? 'var(--ink)' : 'var(--ink-2)',
                              background: t.id === bindSelected ? 'var(--surface-raised)' : 'transparent',
                              fontWeight: t.id === bindSelected ? 500 : 400,
                              transition: 'background 100ms',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)'; }}
                            onMouseLeave={(e) => { if (t.id !== bindSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            {t.title}
                          </div>
                        ))
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
            }}>
              <button
                onClick={() => setBindTarget(null)}
                style={{
                  height: 30, padding: '0 14px', borderRadius: 6, border: '1px solid var(--border-default)',
                  background: 'transparent', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)',
                  cursor: 'pointer', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                取消
              </button>
              <button
                onClick={handleBindTask}
                style={{
                  height: 30, padding: '0 14px', borderRadius: 6, border: 'none',
                  background: 'var(--ink)', color: 'var(--canvas)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                确认
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
