import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAIChat } from '../../hooks/useAIChat';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestions = [
  '帮我梳理当前项目的任务进度',
  '如何优化项目阶段划分',
  '帮我写一份项目周报',
  '从实施方案中拆解开发任务',
];

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const {
    conversations, currentConvId, messages, loading,
    sendMessage, selectConversation, deleteConversation,
    newConversation, loadConversations,
  } = useAIChat();

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
    sendMessage(input.trim());
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
        {isEmpty ? (
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
              <p style={{ marginBottom: 6 }}>试试以下指令：</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => { sendMessage(suggestion); }}
                  style={{
                    fontSize: 12, padding: '5px 12px',
                    border: '1px solid var(--border-subtle)', borderRadius: 20,
                    cursor: 'pointer', color: 'var(--ink-2)', background: 'transparent',
                    transition: 'all 150ms', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ink)';
                    e.currentTarget.style.color = 'var(--canvas)';
                    e.currentTarget.style.borderColor = 'var(--ink)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--ink-2)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
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
              )}
            </div>
          ))
        )}
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
