import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useAIChat, type ToolCallInfo } from '../../hooks/useAIChat';
import { useProjectContext } from '../../contexts/ProjectContext';
import { TaskDrawer } from '../ui/TaskDrawer';
import { tasksApi, templatesApi, artifactsApi, projectsApi } from '../../services/api';
import { notifyDataChange } from '../../utils/dataEvents';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestions = [
  '列出所有未完成的高优先级任务',
  '汇总最近的周报要点',
  '当前项目有哪些关键产物和交付物',
  '哪些任务已逾期或即将到期',
];

const toolNameLabels: Record<string, string> = {
  get_tasks: '任务查询',
  get_reports: '报告查询',
  get_artifacts: '产物查询',
  get_project_overview: '项目概况',
  get_phase_details: '阶段详情',
};

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  med: '#f59e0b',
  low: '#6b7280',
};

interface TemplateItem {
  id: string;
  name: string;
  category?: string;
}

interface SelectedTemplate {
  id: string;
  name: string;
}

function extractHtmlBlocks(content: string): { type: 'markdown' | 'html'; content: string }[] {
  const parts: { type: 'markdown' | 'html'; content: string }[] = [];
  const regex = /```html\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'markdown', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'html', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'markdown', content: content.slice(lastIndex) });
  }
  return parts;
}

function HtmlPreviewCard({ html, onSave }: { html: string; onSave: (html: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      margin: '8px 0', borderRadius: 8,
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '6px 10px', background: 'var(--canvas)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' }}>
          HTML 预览
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              border: '1px solid var(--border-subtle)', background: 'var(--surface)',
              color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {expanded ? '收起' : '展开'}
          </button>
          <button
            onClick={() => onSave(html)}
            style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              border: 'none', background: 'var(--ink)', color: 'var(--canvas)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            保存为产物
          </button>
        </div>
      </div>
      {expanded && (
        <iframe
          srcDoc={html}
          sandbox="allow-same-origin"
          style={{
            width: '100%', height: 400, border: 'none',
            background: '#fff',
          }}
        />
      )}
    </div>
  );
}

function SaveArtifactDialog({
  html,
  defaultProjectId,
  onClose,
  onSaved,
}: {
  html: string;
  defaultProjectId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    projectsApi.list().then(res => {
      setProjects(res.data as { id: string; name: string }[]);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !projectId) {
      setError('请填写产物名称和选择项目');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await artifactsApi.create({
        name: name.trim(),
        type: 'html',
        projectId,
        content: html,
      });
      notifyDataChange('artifacts');
      onSaved();
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 12,
          padding: 20, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--ink)' }}>
          保存为产物
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4, display: 'block' }}>
              产物名称
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入产物名称"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: '1px solid var(--border-subtle)', background: 'var(--canvas)',
                fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4, display: 'block' }}>
              所属项目
            </label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: '1px solid var(--border-subtle)', background: 'var(--canvas)',
                fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            >
              <option value="">选择项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 13,
                border: '1px solid var(--border-subtle)', background: 'var(--surface)',
                color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 13,
                border: 'none', background: 'var(--ink)', color: 'var(--canvas)',
                cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskResultCards({ tasks, onTaskClick }: { tasks: any[]; onTaskClick: (task: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      {tasks.map((t: any) => (
        <div
          key={t.id}
          onClick={() => onTaskClick(t)}
          style={{
            padding: '6px 8px', borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface)', cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-raised)';
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: priorityColors[t.priority] || '#6b7280',
            }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.title}
            </span>
            <span style={{ fontSize: 10, color: 'var(--ink-3)', flexShrink: 0 }}>
              {t.status}
            </span>
          </div>
          {t.dueDate && (
            <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2, paddingLeft: 12 }}>
              截止: {t.dueDate}{t.daysLeft !== null && t.daysLeft !== undefined ? ` (${t.daysLeft < 0 ? `已逾期${-t.daysLeft}天` : t.daysLeft === 0 ? '今天到期' : `剩余${t.daysLeft}天`})` : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ArtifactResultCards({ artifacts, onArtifactClick }: { artifacts: any[]; onArtifactClick: (a: any) => void }) {
  const typeLabels: Record<string, string> = {
    file: '文件', folder: '文件夹',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      {artifacts.map((a: any) => (
        <div
          key={a.id}
          onClick={() => onArtifactClick(a)}
          style={{
            padding: '6px 8px', borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface)', cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-raised)';
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 10, padding: '1px 5px', borderRadius: 3,
              background: 'var(--surface-raised)', color: 'var(--ink-3)', fontWeight: 500, flexShrink: 0,
            }}>
              {typeLabels[a.type] || a.type}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolCallsBlock({
  toolCalls,
  onTaskClick,
  onArtifactClick,
}: {
  toolCalls: ToolCallInfo[];
  onTaskClick: (task: any) => void;
  onArtifactClick: (a: any) => void;
}) {
  return (
    <div style={{
      marginTop: 8, padding: '8px 10px',
      background: 'var(--canvas)', borderRadius: 6,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
        marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        查询了数据 ({toolCalls.length})
      </div>
      {toolCalls.map((tc, i) => {
        const label = toolNameLabels[tc.name] || tc.name;
        const isTasks = tc.name === 'get_tasks' && tc.result?.tasks?.length > 0;
        const isArtifacts = tc.name === 'get_artifacts' && tc.result?.artifacts?.length > 0;
        return (
          <div key={i} style={{
            fontSize: 11, padding: '4px 0',
            borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontSize: 10, padding: '1px 5px', borderRadius: 3,
                background: 'var(--surface-raised)', color: 'var(--ink-3)',
                fontWeight: 500,
              }}>
                {label}
              </span>
              {(isTasks || isArtifacts) && (
                <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                  {isTasks ? `${tc.result.tasks.length} 条任务` : `${tc.result.artifacts.length} 个产物`}
                </span>
              )}
            </div>
            {isTasks && <TaskResultCards tasks={tc.result.tasks} onTaskClick={onTaskClick} />}
            {isArtifacts && <ArtifactResultCards artifacts={tc.result.artifacts} onArtifactClick={onArtifactClick} />}
          </div>
        );
      })}
    </div>
  );
}

const markdownComponents = {
  h1: ({ children }: any) => <h3 style={{ fontSize: 16, fontWeight: 600, margin: '12px 0 6px', letterSpacing: '-0.02em' }}>{children}</h3>,
  h2: ({ children }: any) => <h3 style={{ fontSize: 15, fontWeight: 600, margin: '10px 0 5px', letterSpacing: '-0.02em' }}>{children}</h3>,
  h3: ({ children }: any) => <h4 style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 4px' }}>{children}</h4>,
  p: ({ children }: any) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
  ul: ({ children }: any) => <ul style={{ margin: '0 0 8px', paddingLeft: 20 }}>{children}</ul>,
  ol: ({ children }: any) => <ol style={{ margin: '0 0 8px', paddingLeft: 20 }}>{children}</ol>,
  li: ({ children }: any) => <li style={{ marginBottom: 3 }}>{children}</li>,
  strong: ({ children }: any) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
  code: ({ className, children }: any) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <pre style={{
          background: 'var(--canvas)', borderRadius: 6, padding: '10px 12px',
          margin: '8px 0', overflow: 'auto', fontSize: 12, lineHeight: 1.5,
          fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
        }}>
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code style={{
        background: 'var(--canvas)', padding: '1px 5px', borderRadius: 4,
        fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
      }}>{children}</code>
    );
  },
  blockquote: ({ children }: any) => (
    <blockquote style={{
      borderLeft: '3px solid var(--border-default)', margin: '8px 0',
      paddingLeft: 12, color: 'var(--ink-2)',
    }}>{children}</blockquote>
  ),
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '10px 0' }} />,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>{children}</a>
  ),
  table: ({ children }: any) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 }}>{children}</table>
  ),
  thead: ({ children }: any) => (
    <thead style={{ background: 'var(--canvas)' }}>{children}</thead>
  ),
  tbody: ({ children }: any) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr>{children}</tr>
  ),
  th: ({ children }: any) => (
    <th style={{ border: '1px solid var(--border-default)', padding: '6px 8px', fontWeight: 600, textAlign: 'left' }}>{children}</th>
  ),
  td: ({ children }: any) => (
    <td style={{ border: '1px solid var(--border-default)', padding: '6px 8px' }}>{children}</td>
  ),
};

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const {
    conversations, currentConvId, messages, loading,
    sendMessage, selectConversation, deleteConversation,
    newConversation, loadConversations, clearAllConversations,
  } = useAIChat();

  const { selectedProjectId } = useProjectContext();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<SelectedTemplate[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionHighlightIdx, setMentionHighlightIdx] = useState(0);
  const mentionRef = useRef<HTMLDivElement>(null);

  const [saveDialogHtml, setSaveDialogHtml] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    templatesApi.list().then(res => {
      setTemplates((res.data as any[]).map(t => ({ id: t.id, name: t.name, category: t.category })));
    }).catch(() => {});
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const handleInputChange = (value: string) => {
    setInput(value);
    const atMatch = value.match(/@([^@\s]*)$/);
    if (atMatch) {
      setShowMentionPicker(true);
      setMentionFilter(atMatch[1]);
      setMentionHighlightIdx(0);
    } else {
      setShowMentionPicker(false);
      setMentionFilter('');
    }
  };

  const selectTemplate = useCallback((template: TemplateItem) => {
    setSelectedTemplates(prev => {
      if (prev.some(t => t.id === template.id)) return prev;
      return [...prev, { id: template.id, name: template.name }];
    });
    setInput(prev => prev.replace(/@[^@\s]*$/, ''));
    setShowMentionPicker(false);
    setMentionFilter('');
  }, []);

  const removeTemplate = (id: string) => {
    setSelectedTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionPicker && filteredTemplates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlightIdx(prev => Math.min(prev + 1, filteredTemplates.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlightIdx(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectTemplate(filteredTemplates[mentionHighlightIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionPicker(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && input.trim() && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTaskClick = async (task: any) => {
    try {
      const res = await tasksApi.get(task.id);
      setSelectedTask(res.data);
    } catch {
      setSelectedTask(task);
    }
  };

  const handleArtifactClick = (a: any) => {
    navigate(`/artifacts?keyword=${encodeURIComponent(a.name)}`);
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const tIds = selectedTemplates.length > 0 ? selectedTemplates.map(t => t.id) : undefined;
    sendMessage(input.trim(), selectedProjectId || undefined, tIds);
    setInput('');
    setSelectedTemplates([]);
  };

  const handleSaveArtifact = (html: string) => {
    setSaveDialogHtml(html);
  };

  const isEmpty = messages.length === 0;

  return (
    <aside
      style={{
        width: 420,
        height: '100dvh',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border-subtle)',
        position: 'fixed',
        top: 0,
        right: 0,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 200ms',
      }}
    >
      {/* Header */}
      <div style={{
        height: 56,
        minHeight: 56,
        padding: '0 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
            FlowCraft助手
          </span>
          {loading && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)',
              animation: 'spin 1s linear infinite',
            }} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => { newConversation(); setShowHistory(false); }}
            title="新对话"
            style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-3)', transition: 'all 150ms',
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            title="对话历史"
            style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              background: showHistory ? 'var(--surface-raised)' : 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: showHistory ? 'var(--ink)' : 'var(--ink-3)',
              transition: 'all 150ms',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-3)', transition: 'all 150ms',
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
      </div>

      {/* History dropdown */}
      {showHistory && (
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          maxHeight: 200,
          overflowY: 'auto',
          background: 'var(--surface)',
        }}>
          {conversations.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-4)', padding: '8px 0', textAlign: 'center' }}>
              暂无对话历史
            </div>
          ) : (
            <div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', marginBottom: 4,
            }}>
              <button
                onClick={() => { clearAllConversations(); }}
                style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  border: 'none', background: 'transparent',
                  color: 'var(--ink-4)', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'color 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-4)'; }}
              >
                清空历史
              </button>
            </div>
            {conversations.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  background: c.id === currentConvId ? 'var(--surface-raised)' : 'transparent',
                  transition: 'background 120ms',
                }}
                onClick={() => { selectConversation(c.id); setShowHistory(false); }}
                onMouseEnter={(e) => {
                  if (c.id !== currentConvId) e.currentTarget.style.background = 'var(--surface-raised)';
                }}
                onMouseLeave={(e) => {
                  if (c.id !== currentConvId) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 500, color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.title || '新对话'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                    {c._count?.messages || 0} 条消息
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  style={{
                    width: 22, height: 22, border: 'none', borderRadius: 4,
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--ink-4)', flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-sunken)';
                    e.currentTarget.style.color = 'var(--red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--ink-4)';
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="hide-scrollbar" style={{ flex: 1, padding: '16px 18px', overflowY: 'auto' }}>
        {isEmpty && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
            }}>
              FlowCraft助手
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              <p style={{ marginBottom: 6 }}>
                你好，我是 FlowCraft助手。我可以帮你管理项目、分析任务进度、生成报告等。
              </p>
              <p style={{ marginBottom: 0, color: 'var(--ink-3)', fontSize: 12 }}>
                输入 @ 可引用模板，AI 将按模板结构生成内容。
              </p>
            </div>
          </div>
        )}

        {!isEmpty && messages.map((msg, idx) => {
          const parts = msg.role === 'assistant' ? extractHtmlBlocks(msg.content) : [];
          return (
            <div key={idx} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
                textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
              }}>
                {msg.role === 'user' ? '你' : 'FlowCraft助手'}
              </div>
              {msg.role === 'user' ? (
                  <div style={{
                    fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                ) : (
                  <>
                  {parts.length > 0 ? (
                    parts.map((part, pi) => {
                      if (part.type === 'html') {
                        return (
                          <HtmlPreviewCard
                            key={pi}
                            html={part.content}
                            onSave={handleSaveArtifact}
                          />
                        );
                      }
                      if (!part.content.trim()) return null;
                      return (
                        <div key={pi} className="ai-markdown" style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink)' }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {part.content}
                          </ReactMarkdown>
                        </div>
                      );
                    })
                  ) : (
                    <div className="ai-markdown" style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink)' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  {msg.streaming && (
                    <span style={{
                      display: 'inline-block', width: 2, height: 14,
                      background: 'var(--ink)', marginLeft: 2,
                      verticalAlign: 'text-bottom',
                      animation: 'fadeIn 0.5s ease infinite alternate',
                    }} />
                  )}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <ToolCallsBlock toolCalls={msg.toolCalls} onTaskClick={handleTaskClick} onArtifactClick={handleArtifactClick} />
                  )}
                  </>
                )}
              </div>
          );
        })
        }

        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
          }}>
            快捷操作
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { sendMessage(s, selectedProjectId || undefined); }}
                disabled={loading}
                style={{
                  textAlign: 'left', fontSize: 12.5, padding: '7px 10px',
                  border: '1px solid var(--border-subtle)', borderRadius: 6,
                  background: 'var(--surface-raised)', color: 'var(--ink-2)',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 150ms', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--ink-2)';
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)' }}>
        {/* Selected template tags */}
        {selectedTemplates.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8,
          }}>
            {selectedTemplates.map(t => (
              <span
                key={t.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  background: 'var(--surface-raised)', color: 'var(--ink-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                @{t.name}
                <button
                  onClick={() => removeTemplate(t.id)}
                  style={{
                    border: 'none', background: 'none', padding: 0, margin: 0,
                    cursor: 'pointer', color: 'var(--ink-4)', display: 'flex',
                    alignItems: 'center', lineHeight: 1,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Mention picker dropdown */}
        {showMentionPicker && (
          <div
            ref={mentionRef}
            style={{
              marginBottom: 8, padding: 4,
              border: '1px solid var(--border-subtle)', borderRadius: 8,
              background: 'var(--surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              maxHeight: 180, overflowY: 'auto',
            }}
          >
            {filteredTemplates.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-4)', padding: '8px 10px', textAlign: 'center' }}>
                无匹配模板
              </div>
            ) : (
              filteredTemplates.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  style={{
                    padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                    background: i === mentionHighlightIdx ? 'var(--surface-raised)' : 'transparent',
                    transition: 'background 100ms',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={() => setMentionHighlightIdx(i)}
                >
                  <span style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 3,
                    background: 'var(--surface-raised)', color: 'var(--ink-3)', fontWeight: 500,
                  }}>
                    {t.category || '模板'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                    {t.name}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid var(--border-subtle)', borderRadius: 8,
          padding: '6px 10px', transition: 'border-color 150ms',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="输入问题或 @ 引用模板..."
            disabled={loading}
            rows={1}
            style={{
              flex: 1, border: 'none', outline: 'none', boxShadow: 'none',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
              color: 'var(--ink)', background: 'transparent',
              resize: 'none', lineHeight: 1.5, minHeight: 20,
              overflow: 'hidden',
            }}
          />
          <button
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: input.trim() && !loading ? 'var(--ink)' : 'var(--surface-raised)',
              border: 'none',
              color: input.trim() && !loading ? 'var(--canvas)' : 'var(--ink-4)',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms',
            }}
            onClick={handleSend}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Save artifact dialog */}
      {saveDialogHtml && (
        <SaveArtifactDialog
          html={saveDialogHtml}
          defaultProjectId={selectedProjectId || undefined}
          onClose={() => setSaveDialogHtml(null)}
          onSaved={() => {
            setSaveDialogHtml(null);
            setSaveSuccess(true);
          }}
        />
      )}

      {/* Save success toast */}
      {saveSuccess && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', borderRadius: 8,
          background: 'var(--ink)', color: 'var(--canvas)',
          fontSize: 13, fontWeight: 500, zIndex: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          产物保存成功
        </div>
      )}

      {selectedTask && (
        <TaskDrawer
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          mode="detail"
          task={selectedTask}
        />
      )}
    </aside>
  );
}
