import { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useArtifacts } from '../hooks/useArtifacts';
import { useProjectContext } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { StatsGrid } from '../components/workbench/StatsGrid';
import { TaskList } from '../components/workbench/TaskList';
import { CalendarView } from '../components/workbench/CalendarView';
import { TaskDrawer } from '../components/ui/TaskDrawer';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { tasksApi } from '../services/api';
import { notifyDataChange } from '../utils/dataEvents';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { formatDate, formatDateFull } from '../utils/date';

export function Workbench() {
  const [showNewTaskDrawer, setShowNewTaskDrawer] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskPage, setTaskPage] = useState(1);
  const { toast } = useToast();
  const confirm = useConfirm();
  const { selectedProjectId, projects, projectsLoading } = useProjectContext();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const { tasks, loading: tasksLoading } = useTasks(selectedProjectId ?? undefined);
  const { artifacts, loading: artifactsLoading } = useArtifacts(selectedProjectId ?? undefined);

  const handleDeleteTask = async (task: any) => {
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

  // Calculate stats from real data
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressProjects = projects.filter(p => p.status === 'development' || p.status === 'design').length;
  const totalArtifacts = artifacts.length;

  // This week range: Monday 00:00 to Sunday 23:59
  const { weekStart, weekEnd } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { weekStart: monday, weekEnd: sunday };
  }, []);

  const weekTasks = useMemo(() => {
    return tasks.filter(t => {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      return due && due >= weekStart && due <= weekEnd;
    });
  }, [tasks, weekStart, weekEnd]);

  const thisWeekNew = weekTasks.length;
  const thisWeekDone = weekTasks.filter(t => t.status === 'completed').length;
  const thisWeekArtifacts = artifacts.filter(a => {
    const created = a.createdAt ? new Date(a.createdAt) : null;
    return created && created >= weekStart && created <= weekEnd;
  }).length;

  const stats = [
    { label: '进行中任务', value: totalTasks - completedTasks, change: `本周新增 ${thisWeekNew}` },
    { label: '已完成', value: completedTasks, change: `本周完成 ${thisWeekDone}` },
    { label: '待确认事项', value: tasks.filter(t => t.column === 'review').length, change: '' },
    { label: '项目产物', value: totalArtifacts, change: `本周新增 ${thisWeekArtifacts}` },
  ];

  // Transform this week's tasks for display with pagination
  const taskPageSize = 6;
  const totalTaskPages = Math.max(1, Math.ceil(weekTasks.length / taskPageSize));
  const pagedWeekTasks = weekTasks.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize);
  const transformedTasks = pagedWeekTasks.map(t => ({
    id: t.id,
    title: t.title,
    type: t.type || 'development',
    priority: (t.priority || 'med') as 'high' | 'med' | 'low',
    dueDate: t.dueDate ? formatDate(t.dueDate) : '',
    done: t.status === 'completed',
    description: t.description || undefined,
  }));

  if (projectsLoading || tasksLoading || artifactsLoading) {
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

  return (
    <div className="hide-scrollbar" style={{ height: '100%', overflowY: 'auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2 }}>工作台</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            当前有 {totalTasks - completedTasks} 项待处理任务，{inProgressProjects} 个项目进行中
          </div>
        </div>
        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", fontSize: 12, color: 'var(--ink-3)' }}>
          {formatDateFull(new Date().toISOString())}
        </div>
      </div>

      {/* Stats grid */}
      <StatsGrid stats={stats} />

      {/* Today's tasks section */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>本周任务</h2>
          {!isViewer && (
          <button
            onClick={() => setShowNewTaskDrawer(true)}
            style={{
              height: 28,
              padding: '0 10px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              fontSize: 12,
              color: 'var(--ink-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新建任务
          </button>
          )}
        </div>
        {weekTasks.length === 0 ? (
          <EmptyState
            title="本周暂无任务"
            description="本周截止的任务会显示在这里"
          />
        ) : (
          <TaskList
          tasks={transformedTasks}
          onToggle={(id) => console.log('Toggle task:', id)}
          onClick={(task) => {
            const full = tasks.find(t => t.id === task.id);
            setSelectedTask(full || task);
          }}
          onEdit={isViewer ? undefined : (task) => {
            const full = tasks.find(t => t.id === task.id);
            setEditingTask(full || task);
          }}
          onDelete={isViewer ? undefined : (task) => {
            const full = tasks.find(t => t.id === task.id);
            if (full) handleDeleteTask(full);
          }}
        />
        )}
        <Pagination
          page={taskPage}
          totalPages={totalTaskPages}
          total={weekTasks.length}
          onChange={setTaskPage}
        />
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
        key={editingTask?.id || 'new'}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        mode="edit"
        task={editingTask || undefined}
        onComplete={() => {
          setEditingTask(null);
          notifyDataChange('tasks');
        }}
      />

      {/* Task Create Drawer */}
      <TaskDrawer
        isOpen={showNewTaskDrawer}
        onClose={() => setShowNewTaskDrawer(false)}
        mode="create"
        defaultProjectId={selectedProjectId ?? undefined}
        onComplete={() => {
          setShowNewTaskDrawer(false);
          notifyDataChange('tasks');
        }}
      />

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {/* Calendar section */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>进行中项目</h2>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', transition: 'color 150ms' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
            >
              全部项目 →
            </span>
          </div>
          <CalendarView tasks={tasks} onTaskClick={(task) => setSelectedTask(task)} />
        </div>

        {/* Recent artifacts section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>最近产物</h2>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', transition: 'color 150ms' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
            >
              产物中心 →
            </span>
          </div>
          {artifacts.length === 0 ? (
            <EmptyState title="暂无产物" description="项目产物会显示在这里" />
          ) : (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
              overflow: 'hidden',
            }}>
              {artifacts.slice(0, 5).map((art, i, arr) => (
                <div
                  key={art.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
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
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{art.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, display: 'flex', gap: 8 }}>
                      <span>{{ prototype: '原型', diagram: '流程图', document: '文档', spreadsheet: '表格', report: '汇报' }[art.type] || art.type}</span>
                      <span>{art.createdAt ? formatDate(art.createdAt) : ''}</span>
                    </div>
                    {art.task?.title && (
                      <div style={{
                        marginTop: 5,
                        padding: '4px 8px',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        width: 'fit-content',
                        maxWidth: '100%',
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, flexShrink: 0 }}>
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art.task.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
