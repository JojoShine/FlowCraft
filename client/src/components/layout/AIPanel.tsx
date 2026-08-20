import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAIChat, type Source } from '../../hooks/useAIChat';
import { useProjectContext } from '../../contexts/ProjectContext';

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

const sourceTypeLabels: Record<string, string> = {
  task: '任务',
  artifact: '产物',
  phase: '阶段',
  report: '报告',
  project: '项目',
};

function SourcesBlock({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sources : sources.slice(0, 3);

  return (
    <div style={{
      marginTop: 8, padding: '8px 10px',
      background: 'var(--canvas)', borderRadius: 6,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
        marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        引用来源 ({sources.length})
      </div>
      {visible.map((source, i) => {
        const typeLabel = sourceTypeLabels[source.metadata.sourceType] || source.metadata.sourceType;
        const title = source.metadata.title || source.metadata.label || `${typeLabel}内容`;
        return (
          <div key={i} style={{
            fontSize: 11, padding: '4px 0',
            borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{
                fontSize: 10, padding: '1px 5px', borderRadius: 3,
                background: 'var(--surface-raised)', color: 'var(--ink-3)',
                fontWeight: 500,
              }}>
                {typeLabel}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 500 }}>
                {title}
              </span>
            </div>
            <div style={{
              fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {source.content}
            </div>
          </div>
        );
      })}
      {sources.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: 11, color: 'var(--blue)', background: 'none',
            border: 'none', cursor: 'pointer', padding: '4px 0 0',
            fontFamily: 'inherit',
          }}
        >
          {expanded ? '收起' : `展开更多 (${sources.length - 3})`}
        </button>
      )}
    </div>
  );
}

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const {
    conversations, currentConvId, messages, loading,
    sendMessage, selectConversation, deleteConversation,
    newConversation, loadConversations,
  } = useAIChat();

  const { selectedProjectId } = useProjectContext();

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim(), selectedProjectId || undefined);
    setInput('');
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
            conversations.map(c => (
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
            ))
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
            </div>
          </div>
        )}

        {!isEmpty && messages.map((msg, idx) => (
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
                <div className="ai-markdown" style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink)' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h3 style={{ fontSize: 16, fontWeight: 600, margin: '12px 0 6px', letterSpacing: '-0.02em' }}>{children}</h3>,
                      h2: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, margin: '10px 0 5px', letterSpacing: '-0.02em' }}>{children}</h3>,
                      h3: ({ children }) => <h4 style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 4px' }}>{children}</h4>,
                      p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: '0 0 8px', paddingLeft: 20 }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '0 0 8px', paddingLeft: 20 }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                      code: ({ className, children }) => {
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
                      blockquote: ({ children }) => (
                        <blockquote style={{
                          borderLeft: '3px solid var(--border-default)', margin: '8px 0',
                          paddingLeft: 12, color: 'var(--ink-2)',
                        }}>{children}</blockquote>
                      ),
                      hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '10px 0' }} />,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>{children}</a>
                      ),
                      table: ({ children }) => (
                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 }}>{children}</table>
                      ),
                      thead: ({ children }) => (
                        <thead style={{ background: 'var(--canvas)' }}>{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody>{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr>{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th style={{ border: '1px solid var(--border-default)', padding: '6px 8px', fontWeight: 600, textAlign: 'left' }}>{children}</th>
                      ),
                      td: ({ children }) => (
                        <td style={{ border: '1px solid var(--border-default)', padding: '6px 8px' }}>{children}</td>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {msg.streaming && (
                    <span style={{
                      display: 'inline-block', width: 2, height: 14,
                      background: 'var(--ink)', marginLeft: 2,
                      verticalAlign: 'text-bottom',
                      animation: 'fadeIn 0.5s ease infinite alternate',
                    }} />
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <SourcesBlock sources={msg.sources} />
                )}
                </>
              )}
            </div>
          ))
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid var(--border-subtle)', borderRadius: 8,
          padding: '6px 10px', transition: 'border-color 150ms',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题或指令..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim() && !e.nativeEvent.isComposing) handleSend();
            }}
            disabled={loading}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13,
              color: 'var(--ink)', background: 'transparent',
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
    </aside>
  );
}
