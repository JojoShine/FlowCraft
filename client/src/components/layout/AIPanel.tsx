import { useState } from 'react';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestions = [
  '帮我生成本周的项目周报',
  '补全实施方案的第三章内容',
  '根据方案生成 HTML 原型页面',
  '从实施方案中拆解开发任务',
  '检查当前项目阶段的缺失项',
];

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const [input, setInput] = useState('');

  return (
    <aside
      style={{
        width: 360,
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
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
          AI 项目助手
        </span>
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
      <div style={{ flex: 1, padding: '16px 18px', overflowY: 'auto' }}>
        {/* AI message */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 4,
          }}>
            AI
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>
            <p style={{ marginBottom: 6 }}>
              当前项目「智慧医疗平台」处于原型设计阶段，已完成 45%。有 4 项待确认事项需要处理。
            </p>
            <p style={{ marginBottom: 6 }}>
              我可以帮你推进以下工作：
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setInput(suggestion)}
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 20,
                  cursor: 'pointer',
                  color: 'var(--ink-2)',
                  background: 'transparent',
                  transition: 'all 150ms',
                  fontFamily: "'Geist', sans-serif",
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

        {/* User message */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 4,
          }}>
            你
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>
            <p style={{ marginBottom: 6 }}>
              帮我生成本周的项目周报
            </p>
          </div>
        </div>

        {/* AI response */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 4,
          }}>
            AI
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>
            <p style={{ marginBottom: 6 }}>
              已根据本周完成任务和产物变更生成周报草稿：
            </p>
            <p style={{ marginBottom: 6 }}>
              <strong>本周完成：</strong>
              <br/>· 智慧医院线上接入页面原型
              <br/>· 实施方案 v2.1 更新
              <br/>· 挂号业务流程图评审通过
            </p>
            <p style={{ marginBottom: 6 }}>
              <strong>进行中：</strong>
              <br/>· 南京医疗挂号接口文档编写
              <br/>· 异地就医申请流程确认
            </p>
            <p style={{ marginBottom: 6 }}>
              <strong>风险项：</strong>
              <br/>· 2 项待确认事项超过 3 天未响应
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '6px 10px',
          transition: 'border-color 150ms',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题或指令..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) {
                // Send message
                setInput('');
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontFamily: "'Geist', sans-serif",
              fontSize: 13,
              color: 'var(--ink)',
              background: 'transparent',
            }}
          />
          <button
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'var(--ink)',
              border: 'none',
              color: 'var(--canvas)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            onClick={() => {
              if (input.trim()) {
                setInput('');
              }
            }}
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
