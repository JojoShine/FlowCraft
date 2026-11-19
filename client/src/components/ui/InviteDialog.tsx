import { useState, useEffect } from 'react';
import { inviteApi, type CollaboratorPermissions, type ProjectCollaborator } from '../../services/api';
import { useToast } from './Toast';
import { Select } from './Select';

const permissions = [
  {field: 'canEditDocuments', label: '文档'},
  {field: 'canEditDrawings', label: '绘图'},
] as const;
const permissionOptions = [{value: 'read', label: '只读'}, {value: 'write', label: '可编辑'}];

interface InviteDialogProps {
  projectId: string;
  onClose: () => void;
}

export function InviteDialog({ projectId, onClose }: InviteDialogProps) {
  const [viewers, setViewers] = useState<ProjectCollaborator[]>([]);
  const [newPermissions, setNewPermissions] = useState<CollaboratorPermissions>({canEditDocuments: false, canEditDrawings: false});
  const [newCredential, setNewCredential] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingViewer, setUpdatingViewer] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let active = true;
    inviteApi.list(projectId).then(res => { if (active) setViewers(res.data); }).catch(err => {
      if (active) addToast(err instanceof Error ? err.message : '读取协作者失败', 'error');
    });
    return () => { active = false; };
  }, [projectId]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await inviteApi.create(projectId, newPermissions);
      setNewCredential(res.data);
      const updated = await inviteApi.list(projectId);
      setViewers(updated.data);
    } catch (err: any) {
      addToast(err?.message || '创建邀请失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePermission = async (userId: string, field: keyof CollaboratorPermissions, canEdit: boolean) => {
    setUpdatingViewer(true);
    try {
      const { data } = await inviteApi.updatePermissions(projectId, userId, { [field]: canEdit });
      setViewers(rows => rows.map(row => row.id === userId ? data : row));
    } catch (err) {
      addToast(err instanceof Error ? err.message : '更新权限失败', 'error');
    } finally {
      setUpdatingViewer(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    setUpdatingViewer(true);
    try {
      await inviteApi.revoke(projectId, userId);
      setViewers(v => v.filter(x => x.id !== userId));
    } catch (err: any) {
      addToast(err?.message || '撤销失败', 'error');
    } finally {
      setUpdatingViewer(false);
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
      <div role="dialog" aria-modal="true" aria-label="邀请协作者" style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--surface)',
        borderRadius: 12,
        width: 'min(460px, calc(100vw - 32px))',
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
          <button aria-label="关闭" onClick={onClose} style={{
            width: 28, height: 28, border: 'none', borderRadius: 6, background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div role="group" aria-label="新协作者权限" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
            {permissions.map(({field, label}) => <Select key={field} label={`${label}权限`} value={newPermissions[field] ? 'write' : 'read'} options={permissionOptions} disabled={loading} onValueChange={value => setNewPermissions(current => ({...current, [field]: value === 'write'}))} />)}
          </div>
          <p style={{margin: 0, fontSize: 12, color: 'var(--ink-3)'}}>有编辑权限的协作者可以修改列表中已开启「允许协作者编辑」的文档和绘图。</p>
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
                    padding: '8px 12px',
                    background: 'var(--canvas)',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--ink-1)' }}>{v.username || v.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" }}>
                          {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <button disabled={loading || updatingViewer} onClick={() => handleRevoke(v.id)} style={{
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
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
                      {permissions.map(({field, label}) => <Select key={field} label={label} aria-label={`${v.username || v.name || v.id}的${label}权限`} value={v[field] ? 'write' : 'read'} options={permissionOptions} disabled={loading || updatingViewer} onValueChange={value => void handlePermission(v.id, field, value === 'write')} />)}
                    </div>
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
          <button onClick={handleCreate} disabled={loading || updatingViewer} style={{
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
