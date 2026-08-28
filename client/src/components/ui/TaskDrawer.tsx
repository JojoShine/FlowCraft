import { useState, useEffect } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { RadioGroup } from './RadioGroup';
import { DatePicker } from './DatePicker';
import { Button } from './Button';
import { FileUpload } from './FileUpload';
import { useToast } from './Toast';
import { tasksApi, projectsApi, phasesApi, artifactsApi } from '../../services/api';
import { formatDate } from '../../utils/date';
import { sortByCanonicalOrder } from '../../utils/phaseOrder';
import type { Project, Phase } from '../../types';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'detail' | 'edit' | 'complete';
  task?: any;
  defaultColumn?: string;
  defaultProjectId?: string;
  onComplete?: () => void;
  onEdit?: () => void;
}

const typeOptions = [
  { value: 'requirement', label: '需求' },
  { value: 'prototype', label: '原型设计' },
  { value: 'design', label: '设计' },
  { value: 'development', label: '开发实施' },
  { value: 'testing', label: '测试交付' },
  { value: 'document', label: '文档编写' },
  { value: 'review', label: '评审' },
  { value: 'risk', label: '风险处理' },
  { value: 'research', label: '调研' },
  { value: 'deploy', label: '部署上线' },
];

const phaseOptions = [
  { value: 'discovery', label: '项目线索' },
  { value: 'research', label: '调研梳理' },
  { value: 'design', label: '方案设计' },
  { value: 'prototype', label: '原型设计' },
  { value: 'development', label: '开发实施' },
  { value: 'testing', label: '测试交付' },
  { value: 'review', label: '复盘归档' },
];

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'med', label: '中' },
  { value: 'high', label: '高' },
];

const columnOptions = [
  { value: 'todo', label: '待处理' },
  { value: 'inprogress', label: '进行中' },
  { value: 'review', label: '审查中' },
  { value: 'done', label: '已完成' },
];

const typeColors: Record<string, string> = {
  requirement: 'var(--blue)',
  prototype: 'var(--purple)',
  design: 'var(--pink)',
  development: 'var(--green)',
  testing: 'var(--amber)',
  document: 'var(--indigo)',
  review: 'var(--cyan)',
  risk: 'var(--red)',
  research: 'var(--lime)',
  deploy: 'var(--teal)',
};

const typeLabels: Record<string, string> = {
  requirement: '需求',
  prototype: '原型设计',
  design: '设计',
  development: '开发',
  testing: '测试',
  document: '文档',
  review: '评审',
  risk: '风险',
  research: '调研',
  deploy: '部署',
};

const columnColors: Record<string, string> = {
  todo: 'var(--ink-3)',
  inprogress: 'var(--blue)',
  review: 'var(--amber)',
  done: 'var(--green)',
};

export function TaskDrawer({ isOpen, onClose, mode = 'create', task, defaultColumn, defaultProjectId, onComplete, onEdit }: TaskDrawerProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(task?.title || '');
  const [taskType, setTaskType] = useState(task?.type || 'development');
  const [project, setProject] = useState(defaultProjectId || '');
  const [phase, setPhase] = useState('development');
  const [priority, setPriority] = useState(task?.priority || 'med');
  const [column, setColumn] = useState(defaultColumn || 'todo');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [description, setDescription] = useState(task?.description || '');
  const [completionNotes, setCompletionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);

  const [pendingArtifacts, setPendingArtifacts] = useState<{ id: string; name: string; type: string; isNew?: boolean }[]>([]);
  const [artifactUploadMode, setArtifactUploadMode] = useState<'file' | 'folder'>('file');

  useEffect(() => {
    if (!isOpen) return;
    setArtifactUploadMode('file');
    if (mode === 'create') {
      setTitle('');
      setTaskType('development');
      setPriority('med');
      setDescription('');
      setDueDate('');
      setPhase('development');
      setStartDate(new Date().toISOString().slice(0, 10));
      setColumn(defaultColumn || 'todo');
      setProject(defaultProjectId || '');
      setPendingArtifacts([]);
    }
    if (task && (mode === 'detail' || mode === 'edit' || mode === 'complete')) {
      setTitle(task.title || '');
      setTaskType(task.type || 'development');
      setPriority(task.priority || 'med');
      setDescription(task.description || '');
      setProject(task.projectId || '');
      const phaseName = task.phase?.name || '';
      const matchedOption = phaseOptions.find(o => o.label === phaseName);
      setPhase(matchedOption?.value || task.phaseId || '');
      setColumn(task.column || 'todo');
      const startStr = task.startDate ? task.startDate.slice(0, 10) : '';
      setStartDate(startStr);
      const dateStr = task.dueDate ? task.dueDate.slice(0, 10) : '';
      setDueDate(dateStr);
      // Use artifacts from the passed task if available
      if (task.artifacts && task.artifacts.length > 0) {
        setPendingArtifacts(task.artifacts.map((a: any) => ({
          id: a.id, name: a.name, type: a.type, isNew: false,
        })));
      } else {
        setPendingArtifacts([]);
      }
      // Fetch full task data to get artifacts (list API doesn't include them)
      tasksApi.get(task.id).then((res) => {
        const full = res.data as any;
        if (full?.artifacts?.length > 0) {
          const fetched = full.artifacts.map((a: any) => ({
            id: a.id, name: a.name, type: a.type, isNew: false,
          }));
          setPendingArtifacts((prev) => {
            const existingIds = new Set(prev.map(p => p.id));
            const merged = [...prev, ...fetched.filter((f: any) => !existingIds.has(f.id))];
            return merged;
          });
        }
      }).catch(() => {});
    }
  }, [isOpen, task, mode]);

  useEffect(() => {
    if (!isOpen) return;
    projectsApi.list().then((res) => {
      const list = res.data as Project[];
      setProjects(list);
      setProject((prev) => {
        if (prev) return prev;
        return list.length > 0 ? list[0].id : '';
      });
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!project) return;
    phasesApi.list(project).then((res) => {
      setPhases(sortByCanonicalOrder(res.data as Phase[]));
    }).catch(() => {});
  }, [project]);

  if (!isOpen) return null;

  const resolvePhaseId = async (): Promise<string | null> => {
    if (!phase || !project) return null;
    const label = phaseOptions.find(o => o.value === phase)?.label;
    if (!label) return null;
    const existing = phases.find(p => p.name === label);
    if (existing) return existing.id;
    try {
      const res = await phasesApi.create({
        projectId: project,
        name: label,
        order: phaseOptions.findIndex(o => o.value === phase) + 1,
        status: 'upcoming',
      });
      return (res.data as Phase).id;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: '请输入任务标题', variant: 'error' });
      return;
    }
    if (!project) {
      toast({ title: '请选择所属项目', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const phaseId = await resolvePhaseId();
      let targetTaskId: string | null = task?.id || null;
      if (mode === 'edit' && task?.id) {
        const columnChanged = column !== task.column;
        await tasksApi.update(task.id, {
          title: title.trim(),
          type: taskType,
          projectId: project,
          phaseId,
          priority,
          column,
          status: columnChanged ? (column === 'done' ? 'completed' : 'todo') : undefined,
          startDate: startDate || null,
          dueDate: dueDate || null,
          description: description.trim() || null,
        });
        toast({ title: '任务已更新', variant: 'success' });
      } else {
        const res = await tasksApi.create({
          title: title.trim(),
          type: taskType,
          projectId: project,
          phaseId,
          priority,
          column,
          startDate: startDate || null,
          dueDate: dueDate || null,
          description: description.trim() || null,
          status: column === 'done' ? 'completed' : 'todo',
          isMilestone: false,
        });
        targetTaskId = (res.data as any)?.id || null;
        toast({ title: '任务已创建', variant: 'success' });
      }

      // Bind newly uploaded artifacts to the task
      const newArtifacts = pendingArtifacts.filter(a => a.isNew);
      if (newArtifacts.length > 0 && targetTaskId) {
        for (const artifact of newArtifacts) {
          try {
            await artifactsApi.update(artifact.id, { taskId: targetTaskId });
          } catch {
            // Continue binding other artifacts even if one fails
          }
        }
      }

      onComplete?.();
      onClose();
    } catch (err: any) {
      toast({ title: mode === 'edit' ? '更新失败' : '创建失败', description: err?.message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!completionNotes.trim()) {
      toast({ title: '请填写完成备注', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await tasksApi.update(task.id, {
        column: 'done',
        status: 'completed',
        description: completionNotes.trim(),
      });
      toast({ title: '任务已完成', variant: 'success' });
      onComplete?.();
      onClose();
    } catch (err: any) {
      toast({ title: '操作失败', description: err?.message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay)',
          backdropFilter: 'blur(4px)',
          zIndex: 998,
        }}
        onClick={onClose}
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
        {/* Header */}
        <div style={{
          height: 56,
          padding: '0 20px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {mode === 'create' ? '新建任务' : mode === 'edit' ? '编辑任务' : mode === 'complete' ? '完成任务' : '任务详情'}
          </h3>
          <button
            onClick={onClose}
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'complete' ? (
            <>
              {/* Full task info */}
              <div style={{
                padding: 16,
                background: 'var(--canvas)',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4, letterSpacing: '0.02em' }}>
                    任务名称
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                    {task?.title}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>任务类型</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                      {typeOptions.find(o => o.value === task?.type)?.label || task?.type || '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>优先级</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: task?.priority === 'high' ? 'var(--red)' : task?.priority === 'med' ? 'var(--amber)' : 'var(--ink-3)',
                      }} />
                      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        {priorityOptions.find(o => o.value === task?.priority)?.label || '-'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>起始时间</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" }}>
                      {task?.startDate ? formatDate(task.startDate) : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>截止时间</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" }}>
                      {task?.dueDate ? formatDate(task.dueDate) : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>所属阶段</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                      {task?.phase?.name || '-'}
                    </div>
                  </div>
                </div>

                {task?.assignee && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>负责人</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 500, color: 'var(--ink-2)',
                      }}>
                        {task.assignee.name?.[0] || '?'}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{task.assignee.name}</span>
                    </div>
                  </div>
                )}

                {task?.description && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>描述</div>
                    <div style={{
                      fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6,
                      padding: '8px 10px', background: 'var(--surface)', borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {task.description}
                    </div>
                  </div>
                )}
              </div>

              <Input
                as="textarea"
                label="完成备注"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="请描述完成情况、产出成果等..."
                rows={5}
                style={{ minHeight: 100 }}
              />

              <FileUpload
                label="产出物（可选）"
                hint="上传完成产出物，如文档、设计稿、代码包等"
                onUpload={async (file) => {
                  if (!task?.projectId) {
                    toast({ title: '缺少项目信息', variant: 'error' });
                    throw new Error('No project');
                  }
                  await artifactsApi.upload(file, {
                    projectId: task.projectId,
                    taskId: task.id,
                  });
                  toast({ title: '文件已上传', variant: 'success' });
                }}
              />
            </>
          ) : mode === 'detail' ? (
            <>
              {/* Task header with accent */}
              <div style={{
                position: 'relative',
                padding: '20px 20px 20px 24px',
                background: 'var(--canvas)',
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                {/* Accent bar */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: typeColors[task?.type] || 'var(--ink-3)',
                  borderRadius: '4px 0 0 4px',
                }} />

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4, letterSpacing: '-0.02em' }}>
                    {task?.title}
                  </div>
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      style={{
                        height: 28,
                        padding: '0 10px',
                        fontSize: 11,
                        fontWeight: 500,
                        border: '1px solid var(--border-default)',
                        borderRadius: 6,
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--ink-2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0,
                        transition: 'all 120ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--ink)';
                        e.currentTarget.style.color = 'var(--canvas)';
                        e.currentTarget.style.borderColor = 'var(--ink)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--ink-2)';
                        e.currentTarget.style.borderColor = 'var(--border-default)';
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      编辑
                    </button>
                  )}
                </div>

                {/* Badges row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: 5,
                    background: `color-mix(in srgb, ${typeColors[task?.type] || 'var(--ink-3)'} 12%, transparent)`,
                    color: typeColors[task?.type] || 'var(--ink-3)',
                  }}>
                    {typeLabels[task?.type] || task?.type || '任务'}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: 5,
                    background: task?.priority === 'high' ? 'color-mix(in srgb, var(--red) 12%, transparent)' : task?.priority === 'med' ? 'color-mix(in srgb, var(--amber) 12%, transparent)' : 'color-mix(in srgb, var(--ink-3) 12%, transparent)',
                    color: task?.priority === 'high' ? 'var(--red)' : task?.priority === 'med' ? 'var(--amber)' : 'var(--ink-3)',
                  }}>
                    {task?.priority === 'high' ? '高优先级' : task?.priority === 'med' ? '中优先级' : '低优先级'}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: 5,
                    background: `color-mix(in srgb, ${columnColors[task?.column] || 'var(--ink-3)'} 12%, transparent)`,
                    color: columnColors[task?.column] || 'var(--ink-3)',
                  }}>
                    {columnOptions.find(o => o.value === task?.column)?.label || '待处理'}
                  </span>
                </div>
              </div>

              {/* Date range */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: 'var(--canvas)',
                borderRadius: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4, letterSpacing: '0.02em' }}>开始</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-1)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", fontWeight: 500 }}>
                    {task?.startDate ? formatDate(task.startDate) : '-'}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--ink-4)', flexShrink: 0 }}>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4, letterSpacing: '0.02em' }}>截止</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-1)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", fontWeight: 500 }}>
                    {task?.dueDate ? formatDate(task.dueDate) : '-'}
                  </div>
                </div>
                {task?.completedAt && (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--green)', flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--green)', marginBottom: 4, letterSpacing: '0.02em' }}>完成</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-1)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", fontWeight: 500 }}>
                        {formatDate(task.completedAt)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Phase & Assignee */}
              {(task?.phase?.name || task?.assignee) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: task?.phase?.name && task?.assignee ? '1fr 1fr' : '1fr',
                  gap: 10,
                }}>
                  {task?.phase?.name && (
                    <div style={{
                      padding: '12px 14px',
                      background: 'var(--canvas)',
                      borderRadius: 10,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, letterSpacing: '0.02em' }}>所属阶段</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{task.phase.name}</div>
                    </div>
                  )}
                  {task?.assignee && (
                    <div style={{
                      padding: '12px 14px',
                      background: 'var(--canvas)',
                      borderRadius: 10,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, letterSpacing: '0.02em' }}>负责人</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 600, color: 'var(--ink-2)',
                        }}>
                          {task.assignee.name?.[0] || '?'}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{task.assignee.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {task?.description && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '0.04em' }}>描述</div>
                  <div style={{
                    fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7,
                    padding: '12px 14px', background: 'var(--canvas)', borderRadius: 10,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {task.description}
                  </div>
                </div>
              )}

              {/* Artifacts */}
              {pendingArtifacts.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '0.04em' }}>产物与依赖</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pendingArtifacts.map((a) => {
                      const artifactTypeLabels: Record<string, string> = {
                        file: '文件', folder: '文件夹',
                      };
                      return (
                        <div key={a.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', background: 'var(--canvas)', borderRadius: 8,
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: 'var(--surface-raised)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: 'var(--ink-3)' }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {a.name}
                            </div>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
                            background: 'var(--surface-raised)', color: 'var(--ink-3)',
                            flexShrink: 0,
                          }}>
                            {artifactTypeLabels[a.type] || a.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Input
                label="任务标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入任务名称"
              />

              <Select
                label="任务类型"
                value={taskType}
                onValueChange={setTaskType}
                options={typeOptions}
              />

              <Select
                label="所属项目"
                value={project}
                onValueChange={setProject}
                placeholder="选择项目"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />

              <Select
                label="所属阶段"
                value={phase}
                onValueChange={setPhase}
                options={phaseOptions}
              />

              <RadioGroup
                label="优先级"
                value={priority}
                onValueChange={setPriority}
                options={priorityOptions}
                direction="horizontal"
              />

              <Select
                label="任务状态"
                value={column}
                onValueChange={setColumn}
                options={columnOptions}
              />

              <DatePicker
                label="起始时间"
                value={startDate}
                onChange={setStartDate}
              />

              <DatePicker
                label="截止时间"
                value={dueDate}
                onChange={setDueDate}
              />

              <Input
                as="textarea"
                label="描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="任务描述..."
                rows={4}
                style={{ minHeight: 80 }}
              />

              <FileUpload
                label="依赖附件"
                hint="支持文档、设计稿、接口文件等"
                onUpload={async (file) => {
                  if (!project) {
                    toast({ title: '请先选择所属项目', variant: 'error' });
                    throw new Error('Project not selected');
                  }
                  await artifactsApi.upload(file, {
                    projectId: project,
                    taskId: task?.id,
                  });
                  toast({ title: '文件已上传', variant: 'success' });
                }}
              />

              {/* Artifact Upload Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ink-2)',
                  letterSpacing: '-0.01em',
                }}>
                  产物上传
                  <span style={{ fontWeight: 400, color: 'var(--ink-3)', marginLeft: 6 }}>创建后自动绑定到此任务</span>
                </label>

                {/* File / Folder toggle */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setArtifactUploadMode('file')}
                    style={{
                      height: 28,
                      padding: '0 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border-default)',
                      background: artifactUploadMode === 'file' ? 'var(--ink)' : 'transparent',
                      color: artifactUploadMode === 'file' ? 'var(--canvas)' : 'var(--ink-2)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    上传文件
                  </button>
                  <button
                    onClick={() => setArtifactUploadMode('folder')}
                    style={{
                      height: 28,
                      padding: '0 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border-default)',
                      background: artifactUploadMode === 'folder' ? 'var(--ink)' : 'transparent',
                      color: artifactUploadMode === 'folder' ? 'var(--canvas)' : 'var(--ink-2)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    上传文件夹
                  </button>
                </div>

                {/* File upload */}
                {artifactUploadMode === 'file' ? (
                  <FileUpload
                    hint="点击上传或拖拽文件到此处"
                    onUpload={async (file) => {
                      if (!project) {
                        toast({ title: '请先选择所属项目', variant: 'error' });
                        throw new Error('Project not selected');
                      }
                      const res = await artifactsApi.upload(file, {
                        projectId: project,
                        type: artifactUploadMode,
                      });
                      const artifactId = (res.data as any)?.id;
                      if (artifactId) {
                        setPendingArtifacts(prev => [...prev, { id: artifactId, name: file.name, type: artifactUploadMode, isNew: true }]);
                      }
                    }}
                  />
                ) : (
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: 20, border: '1.5px dashed var(--border-default)', borderRadius: 12,
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--ink-3)';
                      e.currentTarget.style.background = 'var(--canvas)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <input
                      type="file"
                      {...{ webkitdirectory: '', directory: '' } as any}
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const fileList = e.target.files;
                        if (!fileList || fileList.length === 0) return;
                        if (!project) {
                          toast({ title: '请先选择所属项目', variant: 'error' });
                          return;
                        }
                        const folderName = (fileList[0] as any).webkitRelativePath?.split('/')[0] || '文件夹';
                        try {
                          const res = await artifactsApi.uploadFolder(Array.from(fileList), {
                            projectId: project,
                            name: folderName,
                          });
                          const artifactId = (res.data as any)?.id;
                          if (artifactId) {
                            setPendingArtifacts(prev => [...prev, { id: artifactId, name: folderName, type: artifactUploadMode, isNew: true }]);
                            toast({ title: `文件夹已上传 (${fileList.length} 个文件)`, variant: 'success' });
                          }
                        } catch (err: any) {
                          toast({ title: '上传失败', description: err?.message, variant: 'error' });
                        } finally {
                          if (e.target) e.target.value = '';
                        }
                      }}
                    />
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, marginBottom: 6 }}>
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                    </svg>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>点击选择文件夹</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>保留目录结构上传</div>
                  </label>
                )}

                {/* Pending artifacts list */}
                {pendingArtifacts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pendingArtifacts.map((a, i) => {
                      const typeLabels: Record<string, string> = {
                        file: '文件', folder: '文件夹',
                      };
                      return (
                        <div key={a.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          background: 'var(--canvas)',
                          borderRadius: 6,
                          fontSize: 12,
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span style={{ flex: 1, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.name}
                          </span>
                          <span style={{
                            fontSize: 10,
                            padding: '1px 5px',
                            borderRadius: 3,
                            background: 'var(--surface-raised)',
                            color: 'var(--ink-3)',
                            flexShrink: 0,
                          }}>
                            {typeLabels[a.type] || a.type}
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                if (a.isNew) {
                                  await artifactsApi.delete(a.id);
                                } else if (task?.id) {
                                  await artifactsApi.update(a.id, { taskId: null });
                                }
                                setPendingArtifacts(prev => prev.filter((_, j) => j !== i));
                                toast({ title: '已移除', variant: 'success' });
                              } catch (err: any) {
                                toast({ title: '移除失败', description: err?.message, variant: 'error' });
                              }
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex',
                              alignItems: 'center',
                              color: 'var(--ink-3)',
                              flexShrink: 0,
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{
                padding: 12,
                background: 'var(--canvas)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 16, height: 16, color: 'var(--ink-3)', flexShrink: 0 }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                </svg>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>AI 可根据标题自动拆解子任务</span>
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => toast({ title: 'AI 正在拆解...' })}
                >
                  AI 拆解
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {mode !== 'detail' && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}>
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button loading={submitting} onClick={mode === 'complete' ? handleComplete : handleSubmit}>
              {mode === 'complete' ? '确认完成' : mode === 'edit' ? '保存' : '创建'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
