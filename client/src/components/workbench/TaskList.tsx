import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  type: string;
  priority: 'high' | 'med' | 'low';
  dueDate: string;
  done: boolean;
  description?: string;
}

interface TaskListProps {
  tasks: Task[];
  onToggle?: (id: string) => void;
  onClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
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

export function TaskList({ tasks, onToggle, onClick, onEdit, onDelete }: TaskListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
    }}>
      {tasks.map((task) => {
        const accentColor = typeColors[task.type] || 'var(--ink-5)';
        return (
          <div
            key={task.id}
            onClick={() => onClick?.(task)}
            onMouseEnter={() => setHoveredId(task.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: 'relative',
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '12px 12px 12px 16px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              overflow: 'hidden',
              ...(hoveredId === task.id ? {
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transform: 'translateY(-1px)',
              } : {}),
            }}
          >
            {/* Left accent bar */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: accentColor,
              borderRadius: '3px 0 0 3px',
              opacity: hoveredId === task.id ? 1 : 0.6,
              transition: 'opacity 150ms ease',
            }} />

            {/* Edit/Delete buttons - absolute top-right */}
            {(onEdit || onDelete) && (
              <div style={{
                position: 'absolute',
                top: 6,
                right: 6,
                display: 'flex',
                gap: 3,
              }}>
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(task); }}
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
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task); }}
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

            {/* Top row: checkbox + title */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: task.description ? 4 : 8,
              paddingRight: (onEdit || onDelete) ? 48 : 0,
            }}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle?.(task.id);
                }}
                style={{
                  width: 15,
                  height: 15,
                  border: '1.5px solid var(--border-strong)',
                  borderRadius: 4,
                  marginTop: 1,
                  flexShrink: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: task.done ? 'var(--ink)' : 'transparent',
                  transition: 'all 150ms',
                }}
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
                textDecoration: task.done ? 'line-through' : 'none',
              }}>
                {task.title}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div style={{
                fontSize: 11,
                lineHeight: 1.5,
                color: 'var(--ink-3)',
                marginBottom: 8,
                paddingRight: (onEdit || onDelete) ? 48 : 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {task.description}
              </div>
            )}

            {/* Meta row: type badge + status + due date */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flexWrap: 'wrap',
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: 4,
                background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                color: accentColor,
              }}>
                {typeLabels[task.type] || task.type}
              </span>
              <span style={{
                width: 1,
                height: 9,
                background: 'var(--border-subtle)',
              }} />
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
              <span style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10,
                color: 'var(--ink-3)',
                marginLeft: 'auto',
              }}>
                {task.dueDate}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
