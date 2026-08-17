import { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { Select } from './Select';
import { useToast } from './Toast';
import { artifactsApi, tasksApi } from '../../services/api';
import { notifyDataChange } from '../../utils/dataEvents';

interface ArtifactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function ArtifactDialog({ isOpen, onClose, projectId: defaultProjectId }: ArtifactDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [task, setTask] = useState('');
  const [projectId, setProjectId] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string } | null>(null);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'folder'>('file');
  const [folderUploading, setFolderUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
    }
  }, [isOpen, defaultProjectId]);

  useEffect(() => {
    if (!projectId) return;
    tasksApi.list({ projectId }).then((res) => {
      const list = (res.data as any[]) || [];
      setTasks(list.map((t: any) => ({ id: t.id, title: t.title })));
    }).catch(() => setTasks([]));
  }, [projectId]);

  const handleClose = () => {
    setName('');
    setTask('');
    setUploadedFile(null);
    setCreating(false);
    onClose();
  };

  const handleCreate = async () => {
    if (!uploadedFile) {
      toast({ title: '请先上传文件', variant: 'error' });
      return;
    }

    const pid = projectId || defaultProjectId;
    if (!pid) {
      toast({ title: '请选择所属项目', variant: 'error' });
      return;
    }

    setCreating(true);
    try {
      if (task) {
        await artifactsApi.update(uploadedFile.id, { taskId: task });
      }
      toast({ title: '产物已创建', variant: 'success' });
      notifyDataChange('artifacts');
      handleClose();
    } catch (err: any) {
      toast({ title: '创建失败', description: err?.message, variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay)',
          backdropFilter: 'blur(4px)',
          zIndex: 998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={handleClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.12)',
            width: 460,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>
              新建产物
            </h3>
            <button
              onClick={handleClose}
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
            {/* Artifact Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>
                产物名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入产物名称（留空则使用文件名）"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  outline: 'none',
                  transition: 'border-color 150ms, box-shadow 150ms',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ink-3)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.04)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Upload Mode Toggle + Upload */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button
                  onClick={() => setUploadMode('file')}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 6,
                    border: '1px solid var(--border-default)',
                    background: uploadMode === 'file' ? 'var(--ink)' : 'transparent',
                    color: uploadMode === 'file' ? 'var(--canvas)' : 'var(--ink-2)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  上传文件
                </button>
                <button
                  onClick={() => setUploadMode('folder')}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 6,
                    border: '1px solid var(--border-default)',
                    background: uploadMode === 'folder' ? 'var(--ink)' : 'transparent',
                    color: uploadMode === 'folder' ? 'var(--canvas)' : 'var(--ink-2)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  上传文件夹
                </button>
              </div>
              {uploadMode === 'file' ? (
                <FileUpload
                  label="上传文件"
                  hint="支持常见文件格式"
                  onUpload={async (file) => {
                    const pid = projectId || defaultProjectId;
                    if (!pid) throw new Error('No project selected');
                    const res = await artifactsApi.upload(file, {
                      projectId: pid,
                      taskId: task || undefined,
                    });
                    setUploadedFile({ id: res.data.id, name: file.name });
                    if (!name) setName(file.name);
                  }}
                />
              ) : (
                <div>
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: 24, border: '1px dashed rgba(0,0,0,0.15)', borderRadius: 10,
                    cursor: folderUploading ? 'wait' : 'pointer', transition: 'all 150ms',
                    background: 'var(--canvas)',
                  }}>
                    <input
                      type="file"
                      {...{ webkitdirectory: '', directory: '' } as any}
                      disabled={folderUploading}
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        const pid = projectId || defaultProjectId;
                        if (!pid) return;
                        const folderName = (files[0] as any).webkitRelativePath?.split('/')[0] || 'uploaded-folder';
                        setFolderUploading(true);
                        try {
                          const res = await artifactsApi.uploadFolder(files, {
                            projectId: pid,
                            name: name || folderName,
                            taskId: task || undefined,
                          });
                          setUploadedFile({ id: res.data.id, name: folderName });
                          if (!name) setName(folderName);
                          toast({ title: `文件夹已上传 (${files.length} 个文件)`, variant: 'success' });
                        } catch (err: any) {
                          toast({ title: '上传失败', description: err?.message, variant: 'error' });
                        } finally {
                          setFolderUploading(false);
                        }
                      }}
                    />
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, marginBottom: 8 }}>
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                    </svg>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>
                      {folderUploading ? '上传中...' : '点击选择文件夹'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                      支持任意文件夹，保留目录结构
                    </div>
                  </label>
                  {uploadedFile && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-2)', padding: '6px 10px', background: 'var(--surface-raised)', borderRadius: 6 }}>
                      已选择: {uploadedFile.name}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Related Task */}
            <div style={{ marginBottom: 16 }}>
              <Select
                label="关联任务"
                placeholder={tasks.length > 0 ? "选择关联任务" : "当前项目暂无任务"}
                value={task}
                onValueChange={setTask}
                options={tasks.map(t => ({ value: t.id, label: t.title }))}
                searchable
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={handleClose}
              style={{
                height: 36,
                padding: '0 16px',
                borderRadius: 8,
                border: '1px solid var(--border-default)',
                background: 'transparent',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ink-2)',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-raised)';
                e.currentTarget.style.color = 'var(--ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--ink-2)';
              }}
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !uploadedFile}
              style={{
                height: 36,
                padding: '0 16px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--canvas)',
                fontSize: 13,
                fontWeight: 500,
                cursor: (creating || !uploadedFile) ? 'not-allowed' : 'pointer',
                opacity: (creating || !uploadedFile) ? 0.6 : 1,
                transition: 'opacity 150ms',
              }}
              onMouseEnter={(e) => { if (!creating && uploadedFile) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = (creating || !uploadedFile) ? '0.6' : '1'; }}
            >
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
