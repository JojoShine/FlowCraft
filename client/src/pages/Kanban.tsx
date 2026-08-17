import { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjectContext } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { CalendarView } from '../components/kanban/CalendarView';
import { TaskDrawer } from '../components/ui/TaskDrawer';
import { tasksApi } from '../services/api';
import { notifyDataChange } from '../utils/dataEvents';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { formatDate } from '../utils/date';
import type { Task } from '../types';

const columnConfig = [
  { id: 'todo', title: '待处理' },
  { id: 'inprogress', title: '进行中' },
  { id: 'review', title: '审查中' },
  { id: 'done', title: '已完成' },
];

function isWithinLast15Days(date: string | null): boolean {
  if (!date) return true;
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 15);
  cutoff.setHours(0, 0, 0, 0);
  const d = new Date(date);
  return d >= cutoff;
}

function isTaskRecent(task: { column: string; dueDate: string | null; completedAt?: string | null }): boolean {
  if (task.column === 'done') {
    return isWithinLast15Days(task.completedAt || null);
  }
  return isWithinLast15Days(task.dueDate);
}

export function Kanban() {
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');
  const [showNewTaskDrawer, setShowNewTaskDrawer] = useState(false);
  const [defaultColumn, setDefaultColumn] = useState('todo');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { selectedProjectId } = useProjectContext();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const { tasks, loading, error, refetch } = useTasks(selectedProjectId ?? undefined);
  const { toast } = useToast();
  const confirm = useConfirm();

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
      refetch();
      notifyDataChange('tasks');
    } catch {
      toast({ title: '删除失败', variant: 'error' });
    }
  };

  const kanbanTasks = useMemo(() => {
    return tasks.filter(t => isTaskRecent(t));
  }, [tasks]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--red)' }}>加载失败: {error}</div>
      </div>
    );
  }

  const displayTasks = viewMode === 'kanban' ? kanbanTasks : tasks;

  const tasksByColumn = columnConfig.map(col => ({
    id: col.id,
    title: col.title,
    tasks: displayTasks
      .filter(t => t.column === col.id)
      .map(t => ({
        id: t.id,
        title: t.title,
        type: t.type || 'development',
        priority: (t.priority || 'med') as 'high' | 'med' | 'low',
        dueDate: t.dueDate ? formatDate(t.dueDate) : undefined,
        assignee: t.assigneeId ? t.assigneeId.slice(0, 1) : undefined,
        description: t.description || undefined,
      })),
  }));

  const handleTaskClick = (task: { id: string; title: string; type: string; priority: string }) => {
    const full = tasks.find(t => t.id === task.id);
    if (full) setSelectedTask(full);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2 }}>任务看板</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            {viewMode === 'kanban'
              ? kanbanTasks.length === tasks.length
                ? `共 ${tasks.length} 项任务`
                : `显示最近 15 天的任务 · 共 ${kanbanTasks.length} 项`
              : `共 ${tasks.length} 项任务`
            }
          </div>
          {/* View toggle */}
          <div style={{
            display: 'inline-flex',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            overflow: 'hidden',
            marginTop: 6,
          }}>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                height: 28,
                padding: '0 12px',
                border: 'none',
                background: viewMode === 'kanban' ? 'var(--ink)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--canvas)' : 'var(--ink-3)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              看板
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
          onClick={() => setShowNewTaskDrawer(true)}
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
          新建任务
        </button>
        )}
      </div>

      {/* Kanban board or Calendar view */}
      {viewMode === 'kanban' ? (
        <div style={{
          display: 'flex',
          gap: 12,
          flex: 1,
          height: '100%',
          minHeight: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          alignItems: 'stretch',
        }}>
          {tasksByColumn.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onTaskMove={isViewer ? undefined : async (taskId, toColumn) => {
                try {
                  await tasksApi.update(taskId, {
                    column: toColumn,
                    status: toColumn === 'done' ? 'completed' : 'todo',
                  });
                  refetch();
                  notifyDataChange('tasks');
                } catch {
                  toast({ title: '移动失败', variant: 'error' });
                }
              }}
              onTaskClick={handleTaskClick}
              onAddClick={isViewer ? undefined : () => {
                setDefaultColumn(column.id);
                setShowNewTaskDrawer(true);
              }}
              onEditTask={isViewer ? undefined : (task) => {
                const full = tasks.find(t => t.id === task.id);
                if (full) setEditingTask(full);
              }}
              onDeleteTask={isViewer ? undefined : (task) => {
                const full = tasks.find(t => t.id === task.id);
                if (full) handleDeleteTask(full);
              }}
            />
          ))}
        </div>
      ) : (
        <CalendarView
          tasks={tasks.map(t => ({
            id: t.id,
            title: t.title,
            type: t.type || 'development',
            priority: (t.priority || 'med') as 'high' | 'med' | 'low',
            dueDate: t.dueDate || undefined,
          }))}
          onTaskClick={(task) => {
            const full = tasks.find(t => t.id === task.id);
            if (full) setSelectedTask(full);
          }}
        />
      )}

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
          refetch();
          notifyDataChange('tasks');
        }}
      />

      {/* Task Create Drawer */}
      <TaskDrawer
        isOpen={showNewTaskDrawer}
        onClose={() => setShowNewTaskDrawer(false)}
        mode="create"
        defaultColumn={defaultColumn}
        defaultProjectId={selectedProjectId ?? undefined}
        onComplete={() => {
          setShowNewTaskDrawer(false);
          refetch();
          notifyDataChange('tasks');
        }}
      />
    </div>
  );
}
