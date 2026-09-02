import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/ui/Input';

export function Login() {
  const { login, register, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/workbench', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          setLoading(false);
          return;
        }
        await register(username, password, name || undefined);
      } else {
        await login(username, password);
      }
      navigate('/workbench', { replace: true });
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      const msg = typeof apiError === 'string' ? apiError : apiError?.message || err.message || '操作失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const techStack = [
    { label: 'React 19', icon: '⚛' },
    { label: 'TypeScript', icon: 'TS' },
    { label: 'Express 5', icon: 'Ex' },
    { label: 'PostgreSQL', icon: 'PG' },
    { label: 'Prisma', icon: 'Pr' },
    { label: 'Zustand', icon: 'Zu' },
    { label: 'Radix UI', icon: 'Rx' },
    { label: 'Vite', icon: 'Vi' },
  ];

  const features = [
    { text: '从立项到交付的全生命周期管理', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    )},
    { text: '看板、文档、产物、报告一站式整合', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    )},
    { text: 'AI 驱动的项目助手与智能报告', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
        <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/>
      </svg>
    )},
  ];

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      background: 'var(--canvas)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Left panel — Branding */}
      <div className="login-left-panel" style={{
        flex: '1 1 55%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        position: 'relative',
        background: 'var(--surface-sunken)',
        overflow: 'hidden',
      }}>
        {/* Ambient gradients */}
        <div style={{
          position: 'absolute',
          top: '-25%',
          left: '-15%',
          width: '60%',
          height: '60%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '50%',
          height: '50%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, animation: 'loginFadeIn 600ms var(--ease) both' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(24,24,27,0.12)',
            }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--primary-ink)" opacity="0.9"/>
                <path d="M2 17l10 5 10-5" stroke="var(--primary-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M2 12l10 5 10-5" stroke="var(--primary-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <span style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.03em',
            }}>
              FlowCraft
            </span>
          </div>

          {/* Tagline */}
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.3,
            letterSpacing: '-0.03em',
            marginBottom: 16,
          }}>
            独立开发者的
            <br />
            <span style={{ color: 'var(--ink-3)' }}>项目工作台</span>
          </h2>

          <p style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: 'var(--ink-2)',
            marginBottom: 32,
          }}>
            从需求调研、方案设计到开发交付、复盘归档，FlowCraft 帮助你管理软件项目的每一个阶段。看板追踪任务、文档沉淀知识、AI 辅助生成报告 —— 让独立开发更有条理。
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--ink-1)',
                fontSize: 14,
                animation: `loginFadeIn 500ms var(--ease) ${150 + i * 100}ms both`,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'var(--ink-2)',
                }}>
                  {f.icon}
                </div>
                {f.text}
              </div>
            ))}
          </div>

          {/* Tech stack tags */}
          <div>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}>
              技术栈
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {techStack.map((t) => (
                <span key={t.label} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ink-2)',
                  letterSpacing: '0.01em',
                }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--ink-4)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}>
                    {t.icon}
                  </span>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div style={{
        flex: '1 1 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        position: 'relative',
        minWidth: 0,
      }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            width: 38,
            height: 38,
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            background: 'var(--surface)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 200ms var(--ease)',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-raised)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--ink-2)' }}>
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--ink-2)' }}>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        <div style={{
          width: '100%',
          maxWidth: 380,
          animation: 'loginCardIn 500ms var(--ease) both',
        }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: 6,
              letterSpacing: '-0.02em',
            }}>
              {isRegister ? '创建账户' : '欢迎回来'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
              {isRegister ? '填写以下信息开始使用' : '登录以继续'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Input
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="请输入用户名"
              style={{ padding: '10px 14px', height: undefined, borderRadius: 10, fontSize: 14 }}
            />

            {isRegister && (
              <Input
                label="昵称（可选）"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入昵称"
                style={{ padding: '10px 14px', height: undefined, borderRadius: 10, fontSize: 14 }}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>密码</label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="请输入密码"
                  style={{ padding: '10px 40px 10px 14px', height: undefined, borderRadius: 10, fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 28,
                    height: 28,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    borderRadius: 6,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--ink-3)' }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--ink-3)' }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {isRegister && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>确认密码</label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="请再次输入密码"
                    style={{ padding: '10px 40px 10px 14px', height: undefined, borderRadius: 10, fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 28,
                      height: 28,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      borderRadius: 6,
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--ink-3)' }}>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--ink-3)' }}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                fontSize: 13,
                color: 'var(--red)',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px 16px',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--primary-ink)',
                background: 'var(--primary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 200ms var(--ease)',
                marginTop: 4,
                letterSpacing: '0.01em',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = loading ? '0.6' : '1';
              }}
            >
              {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            height: 1,
            background: 'var(--border-subtle)',
            margin: '24px 0 20px',
          }} />

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              style={{
                border: 'none',
                background: 'none',
                fontSize: 13,
                color: 'var(--ink-3)',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'color 200ms var(--ease)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
            >
              {isRegister ? '已有账户？去登录' : '没有账户？去注册'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 16,
            fontSize: 12,
            color: 'var(--ink-3)',
            opacity: 0.7,
          }}>
            <span>
              Powered by{' '}
              <a
                href="https://tbtparent.me"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--ink-3)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 200ms var(--ease)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
              >
                TBTparent
              </a>
            </span>
            <span aria-hidden="true" style={{ width: 1, height: 12, background: 'var(--border-default)' }} />
            <a
              href="https://github.com/JojoShine/FlowCraft"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="查看 FlowCraft GitHub 仓库"
              title="查看 GitHub 仓库"
              style={{ color: 'var(--ink-3)', display: 'inline-flex', padding: 3, transition: 'color 200ms var(--ease)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 15, height: 15, fill: 'currentColor' }}>
                <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.29-1.69-1.29-1.69-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.29-5.28-1.29-5.28-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loginCardIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes loginFadeIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 860px) {
          .login-left-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
