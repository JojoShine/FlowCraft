import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProjectSpace } from '../hooks/useProjectSpace';
import { useProjectContext } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { TaskDrawer } from '../components/ui/TaskDrawer';
import { InviteDialog } from '../components/ui/InviteDialog';
import { ArtifactViewer } from '../components/ui/ArtifactViewer';
import { Pagination } from '../components/ui/Pagination';
import { StatsGrid } from '../components/workbench/StatsGrid';
import { tasksApi, projectsApi } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { formatDate } from '../utils/date';
import { notifyDataChange } from '../utils/dataEvents';
import type { Task } from '../types';

const PROJECT_STATUSES = [
  { value: 'discovery', label: '项目线索' },
  { value: 'research', label: '调研梳理' },
  { value: 'design', label: '方案设计' },
  { value: 'prototype', label: '原型设计' },
  { value: 'development', label: '开发实施' },
  { value: 'testing', label: '测试交付' },
  { value: 'completed', label: '复盘归档' },
];

const phaseSummaries: Record<string, string> = {
  '项目线索': '明确项目目标与核心干系人，完成初步需求收集与可行性评估。',
  '调研梳理': '梳理业务流程与系统现状，完成关键用户访谈，输出调研报告。',
  '方案设计': '完成技术选型与系统架构设计，定稿实施方案，拆分核心模块。',
  '原型设计': '交付核心页面原型，标注交互流程，移交开发团队。',
  '开发实施': '核心模块开发与前后端联调，推进功能实现与接口对接。',
  '测试交付': '执行集成测试与用户验收，修复缺陷，准备上线。',
  '复盘归档': '项目上线后复盘总结经验教训，整理文档并归档。',
};

function fmtDate(s: string | null) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDateFull(s: string | null) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function ProjectSpace() {
  const { selectedProjectId } = useProjectContext();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const {
    project, tasks, phases, loading, loadingTasks, error,
    activePhaseId, setActivePhaseId,
  } = useProjectSpace(selectedProjectId || '');
  const [searchParams, setSearchParams] = useSearchParams();
  const filterTaskId = searchParams.get('task');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [artifactPage, setArtifactPage] = useState(1);
  const [viewingArtifact, setViewingArtifact] = useState<any>(null);
  const TASKS_PER_PAGE = 9;
  const ARTIFACTS_PER_PAGE = 9;

  const clearTaskFilter = () => setSearchParams({});

  const { toast } = useToast();
  const confirm = useConfirm();

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    if (statusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownOpen]);

  const handleStatusChange = async (newStatus: string) => {
    if (!project || newStatus === project.status) {
      setStatusDropdownOpen(false);
      return;
    }
    try {
      await projectsApi.update(project.id, { status: newStatus });
      toast({ title: '状态已更新', variant: 'success' });
      setStatusDropdownOpen(false);
      notifyDataChange('projects');
    } catch (err: any) {
      toast({ title: '更新失败', description: err?.message, variant: 'error' });
    }
  };

  const currentStatusLabel = PROJECT_STATUSES.find(s => s.value === project?.status)?.label || project?.status || '未开始';

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEditingName = () => {
    if (!project) return;
    setNameDraft(project.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 10);
  };

  const handleNameSave = async () => {
    if (!project) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === project.name) {
      setEditingName(false);
      return;
    }
    try {
      await projectsApi.update(project.id, { name: trimmed });
      toast({ title: '名称已更新', variant: 'success' });
      notifyDataChange('projects');
    } catch (err: any) {
      toast({ title: '更新失败', description: err?.message, variant: 'error' });
    }
    setEditingName(false);
  };

  const handleDeleteTask = async (task: Task) => {
    const ok = await confirm({
      title: '删除任务',
      description: `确认删除任务「${task.title}」？此操作不可撤销。`,
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await tasksApi.delete(task.id);
      toast({ title: '任务已删除', variant: 'success' });
      notifyDataChange('tasks');
    } catch (err: any) {
      toast({ title: '删除失败', description: err?.message, variant: 'error' });
    }
  };

  // Auto-switch to the phase containing the filtered task
  useEffect(() => {
    if (!filterTaskId || phases.length === 0) return;
    tasksApi.get(filterTaskId).then((res) => {
      const task = res.data as Task;
      if (task?.phaseId && task.phaseId !== activePhaseId) {
        setActivePhaseId(task.phaseId);
      }
    }).catch(() => {});
  }, [filterTaskId, phases.length]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--red)' }}>{error || '项目不存在'}</div>
      </div>
    );
  }

  const activePhase = phases.find(p => p.id === activePhaseId);
  const tasksInPhase = tasks;
  const doneTasks = tasksInPhase.filter(t => t.column === 'done').length;
  const inProgressTasks = tasksInPhase.filter(t => t.column === 'inprogress' || t.column === 'review').length;
  const phaseArtifacts = tasksInPhase.flatMap(t => t.artifacts || []);
  const completionRate = tasksInPhase.length > 0 ? Math.round((doneTasks / tasksInPhase.length) * 100) : 0;

  const stats = [
    { label: '阶段任务', value: tasksInPhase.length, change: `${inProgressTasks} 项进行中` },
    { label: '已完成', value: doneTasks, change: `${completionRate}% 完成率` },
    { label: '待处理', value: tasksInPhase.length - doneTasks - inProgressTasks, change: '待分配或待开始' },
    { label: '阶段产物', value: phaseArtifacts.length, change: `${tasksInPhase.filter(t => (t.artifacts || []).length > 0).length} 项任务有产物` },
  ];

  const totalTaskPages = Math.ceil(tasksInPhase.length / TASKS_PER_PAGE);
  const paginatedTasks = tasksInPhase.slice(
    (taskPage - 1) * TASKS_PER_PAGE,
    taskPage * TASKS_PER_PAGE
  );

  const transformedTasks = paginatedTasks
    .filter(t => !filterTaskId || t.id === filterTaskId)
    .map(t => ({
      id: t.id,
      title: t.title,
      type: t.type || 'development',
      priority: (t.priority || 'med') as 'high' | 'med' | 'low',
      dueDate: t.dueDate ? fmtDate(t.dueDate) : '',
      done: t.column === 'done',
      description: t.description || undefined,
    }));

  const filterMatchTask = filterTaskId ? tasksInPhase.find(t => t.id === filterTaskId) : undefined;

  const totalArtifactPages = Math.ceil(phaseArtifacts.length / ARTIFACTS_PER_PAGE);
  const paginatedArtifacts = phaseArtifacts.slice(
    (artifactPage - 1) * ARTIFACTS_PER_PAGE,
    artifactPage * ARTIFACTS_PER_PAGE
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSave();
                if (e.key === 'Escape') setEditingName(false);
              }}
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                border: 'none',
                borderBottom: '2px solid var(--ink)',
                outline: 'none',
                background: 'transparent',
                color: 'var(--ink)',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: '0 0 2px',
                minWidth: 200,
              }}
            />
          ) : (
            <div
              style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8, cursor: isViewer ? 'default' : 'pointer' }}
              onClick={() => { if (!isViewer) startEditingName(); }}
              title={isViewer ? undefined : '点击编辑项目名称'}
            >
              {project.name}
              {!isViewer && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--ink-3)', opacity: 0.5 }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
              {!isViewer && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInvite(true); }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-3)',
                    opacity: 0.5,
                    transition: 'all 150ms',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = 'var(--ink)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.5';
                    e.currentTarget.style.color = 'var(--ink-3)';
                  }}
                  title="邀请协作者"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                </button>
              )}
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isViewer && <div ref={statusDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 5,
                  border: '1px solid var(--border-default)',
                  background: 'var(--surface)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ink-3)';
                  e.currentTarget.style.color = 'var(--ink)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--ink-2)';
                }}
              >
                {currentStatusLabel}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {statusDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  padding: 4,
                  minWidth: 120,
                  zIndex: 100,
                }}>
                  {PROJECT_STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(s.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 5,
                        border: 'none',
                        background: project?.status === s.value ? 'var(--surface-raised)' : 'transparent',
                        fontSize: 12,
                        color: 'var(--ink)',
                        cursor: 'pointer',
                        transition: 'background 120ms',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = project?.status === s.value ? 'var(--surface-raised)' : 'transparent'; }}
                    >
                      {project?.status === s.value && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      <span style={{ marginLeft: project?.status === s.value ? 0 : 18 }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>}
            <span>{activePhase?.name}阶段 · {tasksInPhase.length} 项任务</span>
          </div>
        </div>
        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", fontSize: 12, color: 'var(--ink-3)' }}>
          {project.startDate && project.endDate
            ? `${fmtDateFull(project.startDate)} — ${fmtDateFull(project.endDate)}`
            : ''}
        </div>
      </div>

      {/* AI Summary */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--surface-raised)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22"/>
            <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93"/>
            <path d="M8.5 8.5h7"/>
            <path d="M6 13h12"/>
            <path d="M7 17h10"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {activePhase?.name} — 阶段概览
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            {activePhase ? phaseSummaries[activePhase.name] || '' : ''}
          </div>
        </div>
      </div>

      {/* Phase Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 24,
      }}>
        {phases.map(phase => {
          const isActive = phase.id === activePhaseId;
          const taskCount = phase._count?.tasks ?? 0;

          return (
            <button
              key={phase.id}
              onClick={() => {
                setActivePhaseId(phase.id);
                setTaskPage(1);
                setArtifactPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 150ms',
                marginBottom: -1,
              }}
            >
              <span style={{
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--ink)' : 'var(--ink-2)',
              }}>
                {phase.name}
              </span>
              <span style={{
                  fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                  fontSize: 10,
                  color: 'var(--ink-3)',
                  padding: '1px 5px',
                  background: 'var(--surface-raised)',
                  borderRadius: 3,
                }}>
                  {taskCount}
                </span>
            </button>
          );
        })}
      </div>

      {/* Phase Dashboard — mini workbench */}
      <StatsGrid stats={stats} />

      {/* Task list section */}
      <div style={{ marginBottom: 28 }}>
        {/* Search filter banner */}
        {filterTaskId && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            marginBottom: 14,
            background: 'var(--surface-overlay)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--ink-2)',
          }}>
            <span>
              搜索结果：{filterMatchTask ? <strong style={{ fontWeight: 500, color: 'var(--ink)' }}>{filterMatchTask.title}</strong> : '未找到匹配任务'}
            </span>
            <button
              onClick={clearTaskFilter}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 5,
                border: '1px solid var(--border-default)',
                background: 'var(--surface)',
                fontSize: 11,
                color: 'var(--ink-2)',
                cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              清除
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {activePhase?.name}任务
          </h2>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" }}>
            {doneTasks}/{tasksInPhase.length} 已完成
          </span>
        </div>
        {loadingTasks ? (
          <div style={{
            fontSize: 13,
            color: 'var(--ink-3)',
            padding: '32px 0',
            textAlign: 'center',
            background: 'var(--canvas)',
            borderRadius: 12,
          }}>
            加载中...
          </div>
        ) : transformedTasks.length === 0 ? (
          <div style={{
            fontSize: 13,
            color: 'var(--ink-3)',
            padding: '32px 0',
            textAlign: 'center',
            background: 'var(--canvas)',
            borderRadius: 12,
          }}>
            该阶段暂无任务
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}>
            {transformedTasks.map(task => {
              const accentColors: Record<string, string> = {
                requirement: 'var(--blue)', prototype: 'var(--purple)', design: 'var(--pink)',
                development: 'var(--green)', testing: 'var(--amber)', document: 'var(--indigo)',
                review: 'var(--cyan)', risk: 'var(--red)', research: 'var(--lime)', deploy: 'var(--teal)',
              };
              const typeLabels: Record<string, string> = {
                requirement: '需求', prototype: '原型设计', design: '设计',
                development: '开发', testing: '测试', document: '文档',
                review: '评审', risk: '风险', research: '调研', deploy: '部署',
              };
              const accent = accentColors[task.type] || 'var(--ink-3)';
              const fullTask = tasks.find(t => t.id === task.id);

              return (
                <div
                  key={task.id}
                  onClick={() => fullTask && setSelectedTask(fullTask)}
                  style={{
                    position: 'relative',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: '12px 12px 12px 16px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: accent,
                    borderRadius: '3px 0 0 3px',
                    opacity: 0.6,
                  }} />

                  {/* Edit/Delete buttons */}
                  {!isViewer && <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      display: 'flex',
                      gap: 4,
                      zIndex: 2,
                    }}
                  >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (fullTask) setEditingTask(fullTask);
                        }}
                        style={{
                          width: 24,
                          height: 24,
                          border: '1px solid var(--border-default)',
                          borderRadius: 5,
                          background: 'var(--surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ink-2)',
                          transition: 'all 120ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--ink)';
                          e.currentTarget.style.color = 'var(--canvas)';
                          e.currentTarget.style.borderColor = 'var(--ink)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--surface)';
                          e.currentTarget.style.color = 'var(--ink-2)';
                          e.currentTarget.style.borderColor = 'var(--border-default)';
                        }}
                        title="编辑"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (fullTask) handleDeleteTask(fullTask);
                        }}
                        style={{
                          width: 24,
                          height: 24,
                          border: '1px solid var(--border-default)',
                          borderRadius: 5,
                          background: 'var(--surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ink-2)',
                          transition: 'all 120ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--red)';
                          e.currentTarget.style.color = 'var(--on-accent)';
                          e.currentTarget.style.borderColor = 'var(--red)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--surface)';
                          e.currentTarget.style.color = 'var(--ink-2)';
                          e.currentTarget.style.borderColor = 'var(--border-default)';
                        }}
                        title="删除"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isViewer && !task.done && fullTask) setCompletingTask(fullTask);
                      }}
                      style={{
                      width: 15,
                      height: 15,
                      border: `1.5px solid ${task.done ? 'var(--ink)' : 'var(--border-strong)'}`,
                      borderRadius: 4,
                      marginTop: 1,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: task.done ? 'var(--ink)' : 'transparent',
                      cursor: task.done || isViewer ? 'default' : 'pointer',
                      transition: 'all 150ms',
                    }}
                      onMouseEnter={(e) => { if (!task.done) e.currentTarget.style.borderColor = 'var(--ink)'; }}
                      onMouseLeave={(e) => { if (!task.done) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                    >
                      {task.done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--canvas)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <div style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.4,
                      color: task.done ? 'var(--ink-3)' : 'var(--ink)',
                      letterSpacing: '-0.01em',
                      minWidth: 0,
                    }}>
                      {task.title}
                    </div>
                  </div>
                  {task.description && (
                    <div style={{
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: 'var(--ink-3)',
                      marginBottom: 8,
                      paddingRight: 48,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {task.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                      color: accent,
                    }}>
                      {typeLabels[task.type] || task.type}
                    </span>
                    <span style={{ width: 1, height: 9, background: 'var(--border-subtle)' }} />
                    <span style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: task.done ? 'var(--surface-raised)' : 'var(--ink)',
                      color: task.done ? 'var(--ink-3)' : 'var(--canvas)',
                    }}>
                      {task.done ? '已完成' : '进行中'}
                    </span>
                    {task.dueDate && (
                      <span style={{
                        fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                        fontSize: 10,
                        color: 'var(--ink-3)',
                        marginLeft: 'auto',
                      }}>
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination
          page={taskPage}
          totalPages={totalTaskPages}
          onChange={setTaskPage}
        />
      </div>

      {/* Recent artifacts for this phase */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>阶段产物</h2>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" }}>
            {phaseArtifacts.length} 份
          </span>
        </div>
        {paginatedArtifacts.length === 0 ? (
          <div style={{
            fontSize: 13,
            color: 'var(--ink-3)',
            padding: '32px 0',
            textAlign: 'center',
            background: 'var(--canvas)',
            borderRadius: 12,
          }}>
            该阶段暂无产物
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}>
              {paginatedArtifacts.map((art) => {
                const artTypeIcons: Record<string, React.ReactNode> = {
                  document: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
                  prototype: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>,
                  diagram: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
                  spreadsheet: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></>,
                  report: <><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></>,
                  folder: <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>,
                };
                const artTypeLabels: Record<string, string> = {
                  document: '文档', prototype: '原型', diagram: '流程图',
                  spreadsheet: '表格', report: '汇报', folder: '文件夹',
                };
                const artDate = art.createdAt || art.updatedAt;
                const dateStr = artDate ? formatDate(artDate) : '';

                return (
                  <div
                    key={art.id}
                    onClick={() => setViewingArtifact({ id: art.id, name: art.name, type: art.type, filePath: art.filePath, content: art.content, shareToken: art.shareToken })}
                    style={{
                      position: 'relative',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: '12px 12px 12px 16px',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      background: 'var(--ink-2)',
                      borderRadius: '3px 0 0 3px',
                      opacity: 0.4,
                    }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'var(--surface-raised)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--ink-2)' }}>
                          {artTypeIcons[art.type] || artTypeIcons.document}
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {art.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'var(--surface-raised)',
                            color: 'var(--ink-2)',
                          }}>
                            {artTypeLabels[art.type] || art.type}
                          </span>
                          {dateStr && (
                            <span style={{
                              fontSize: 10,
                              color: 'var(--ink-4)',
                              fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                            }}>
                              {dateStr}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination
              page={artifactPage}
              totalPages={totalArtifactPages}
              onChange={setArtifactPage}
            />
          </>
        )}
      </div>

      {/* Task Detail Drawer (read-only) */}
      {selectedTask && (
        <TaskDrawer
          key={selectedTask.id}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          mode="detail"
          task={selectedTask}
          onEdit={isViewer ? undefined : () => {
            setEditingTask(selectedTask);
            setSelectedTask(null);
          }}
        />
      )}

      {/* Task Edit Drawer */}
      <TaskDrawer
        key={editingTask?.id || 'edit-drawer'}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        mode="edit"
        task={editingTask || undefined}
        onComplete={() => {
          setEditingTask(null);
          notifyDataChange('tasks');
        }}
      />

      {/* Task Complete Drawer */}
      <TaskDrawer
        key={completingTask?.id || 'complete-drawer'}
        isOpen={!!completingTask}
        onClose={() => setCompletingTask(null)}
        mode="complete"
        task={completingTask || undefined}
        onComplete={() => {
          setCompletingTask(null);
          notifyDataChange('tasks');
        }}
      />

      {/* Invite Dialog */}
      {showInvite && selectedProjectId && (
        <InviteDialog projectId={selectedProjectId} onClose={() => setShowInvite(false)} />
      )}

      {/* Artifact Viewer */}
      <ArtifactViewer
        isOpen={!!viewingArtifact}
        artifact={viewingArtifact}
        onClose={() => setViewingArtifact(null)}
      />
    </div>
  );
}
