import { useState, useEffect } from 'react';
import { inviteApi } from '../../services/api';
import { useToast } from './Toast';

interface Viewer {
  id: string;
  username: string;
  name: string;
  createdAt: string;
}

interface InviteDialogProps {
  projectId: string;
  onClose: () => void;
}

export function InviteDialog({ projectId, onClose }: InviteDialogProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [newCredential, setNewCredential] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    inviteApi.list(projectId).then(res => setViewers(res.data));
  }, [projectId]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await inviteApi.create(projectId);
      setNewCredential(res.data);
      const updated = await inviteApi.list(projectId);
      setViewers(updated.data);
    } catch (err: any) {
      addToast(err?.message || '创建邀请失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    try {
      await inviteApi.revoke(projectId, userId);
      setViewers(v => v.filter(x => x.id !== userId));
    } catch (err: any) {
      addToast(err?.message || '撤销失败', 'error');
    }
  };

  const handleCopy = () => {
    if (!newCredential) return;
    navigator.clipboard.writeText(`用户名: ${newCredential.username}\n密码: ${newCredential.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', backdropFilter: 'blur(4px)', zIndex: 998 }} onClick={onClose} />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--surface)',
        borderRadius: 12,
        width: 420,
        maxHeight: '80vh',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>邀请协作者</span>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: 'none', borderRadius: 6, background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {newCredential && (
            <div style={{
              padding: 14,
              background: 'var(--canvas)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 8 }}>新账号（请保存，关闭后无法再次查看密码）</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace", fontSize: 13, lineHeight: 1.8 }}>
                <div>用户名: {newCredential.username}</div>
                <div>密码: {newCredential.password}</div>
              </div>
              <button onClick={handleCopy} style={{
                marginTop: 8,
                padding: '4px 12px',
                fontSize: 12,
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                background: copied ? 'rgba(16,185,129,0.1)' : 'transparent',
                cursor: 'pointer',
                color: copied ? 'var(--green)' : 'var(--ink-2)',
              }}>
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8 }}>当前临时用户</div>
            {viewers.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '12px 0' }}>暂无临时用户</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {viewers.map(v => (
                  <div key={v.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--canvas)',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--ink-1)' }}>{v.username}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" }}>
                        {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    <button onClick={() => handleRevoke(v.id)} style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 4,
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#ef4444',
                    }}>
                      撤销
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}>
          <button onClick={handleCreate} disabled={loading} style={{
            height: 32,
            padding: '0 16px',
            borderRadius: 6,
            background: 'var(--ink)',
            color: 'var(--canvas)',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? '生成中...' : '生成邀请'}
          </button>
        </div>
      </div>
    </>
  );
}
