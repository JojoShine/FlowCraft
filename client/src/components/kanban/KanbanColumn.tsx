import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  type: string;
  priority: 'high' | 'med' | 'low';
  dueDate?: string;
  assignee?: string;
  done?: boolean;
  description?: string;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

interface KanbanColumnProps {
  column: Column;
  onTaskMove?: (taskId: string, toColumn: string) => void;
  onTaskClick?: (task: Task) => void;
  onAddClick?: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

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

export function KanbanColumn({ column, onTaskMove, onTaskClick, onAddClick, onEditTask, onDeleteTask }: KanbanColumnProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskMove?.(taskId, column.id);
    }
    setDraggedTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        flex: '1 1 0',
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {column.title}
          <span style={{
            fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
            fontSize: 11,
            color: 'var(--ink-3)',
            fontWeight: 500,
          }}>
            {column.tasks.length}
          </span>
        </div>
        {onAddClick && (
        <button
          onClick={onAddClick}
          style={{
            width: 24,
            height: 24,
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        )}
      </div>

      {/* Tasks */}
      <div
        className="kanban-tasks-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          padding: 8,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {column.tasks.map((task) => (
          <div
            key={task.id}
            draggable={!!onTaskMove}
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onTaskClick?.(task)}
            className={task.done ? 'done' : ''}
            style={{
              position: 'relative',
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '12px 14px 12px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              overflow: 'hidden',
              opacity: draggedTaskId === task.id ? 0.5 : 1,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (draggedTaskId !== task.id) {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                // Show accent bar
                const before = e.currentTarget.querySelector('.accent-bar') as HTMLElement;
                if (before) before.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
              const before = e.currentTarget.querySelector('.accent-bar') as HTMLElement;
              if (before) before.style.opacity = '0.6';
            }}
          >
            {/* Left accent bar - use type color */}
            <div
              className="accent-bar"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: typeColors[task.type] || 'var(--ink-3)',
                borderRadius: '3px 0 0 3px',
                opacity: 0.6,
                transition: 'opacity 0.15s ease',
              }}
            />

            {/* Edit/Delete buttons - absolute top-right */}
            {(onEditTask || onDeleteTask) && (
              <div style={{
                position: 'absolute',
                top: 6,
                right: 6,
                display: 'flex',
                gap: 3,
              }}>
                {onEditTask && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      border: '1px solid var(--border-default)',
                      background: 'var(--surface)',
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-raised)';
                      e.currentTarget.style.color = 'var(--ink)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.color = 'var(--ink-2)';
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                )}
                {onDeleteTask && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      border: '1px solid var(--border-default)',
                      background: 'var(--surface)',
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'all 150ms',
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
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Title */}
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.4,
              color: task.done ? 'var(--ink-3)' : 'var(--ink)',
              letterSpacing: '-0.01em',
              marginBottom: task.description ? 4 : 8,
              paddingRight: 48,
            }}>
              {task.title}
            </div>

            {/* Description */}
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

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 4,
                background: `color-mix(in srgb, ${typeColors[task.type] || 'var(--ink-3)'} 10%, transparent)`,
                color: typeColors[task.type] || 'var(--ink-3)',
              }}>
                {typeLabels[task.type] || task.type}
              </span>
              {task.dueDate && (
                <>
                  <span style={{ width: 1, height: 9, background: 'var(--border-subtle)' }} />
                  <span style={{
                    fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                    fontSize: 10,
                    color: 'var(--ink-3)',
                    marginLeft: 'auto',
                  }}>
                    {task.dueDate}
                  </span>
                </>
              )}
              {task.assignee && (
                <div style={{
                  marginLeft: task.dueDate ? 4 : 'auto',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--surface-sunken)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 600,
                  color: 'var(--ink-2)',
                }}>
                  {task.assignee}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
