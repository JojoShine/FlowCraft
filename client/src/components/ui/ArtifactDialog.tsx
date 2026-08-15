import { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { Select } from './Select';
import { useToast } from './Toast';
import { artifactsApi, projectsApi, tasksApi } from '../../services/api';
import { notifyDataChange } from '../../utils/dataEvents';
import type { Project } from '../../types';

interface ArtifactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

const typeToApi: Record<string, string> = {
  proto: 'prototype',
  flow: 'diagram',
  doc: 'document',
  table: 'spreadsheet',
  report: 'report',
};

const artTypes = {
  proto: { label: '原型', desc: '上传文件或文件夹', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  )},
  flow: { label: '流程图', desc: 'Excalidraw 在线绘图', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <path d="M10 6.5h4m-4 11h4m-7-7v4"/>
    </svg>
  )},
  doc: { label: '文档', desc: 'Notion 在线写作', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )},
  table: { label: '表格', desc: '上传文件', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>
  )},
  report: { label: '汇报', desc: '上传文件', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )},
};

export function ArtifactDialog({ isOpen, onClose, projectId: defaultProjectId }: ArtifactDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [task, setTask] = useState('');
  const [projectId, setProjectId] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'folder'>('file');
  const [folderUploading, setFolderUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
    } else {
      projectsApi.list().then((res) => {
        const list = res.data as Project[];
        setProjects(list);
        if (list.length > 0) setProjectId(list[0].id);
      }).catch(() => {});
    }
  }, [isOpen, defaultProjectId]);

  useEffect(() => {
    if (!projectId) return;
    tasksApi.list({ projectId }).then((res) => {
      const list = (res.data as any[]) || [];
      setTasks(list.map((t: any) => ({ id: t.id, title: t.title })));
    }).catch(() => setTasks([]));
  }, [projectId]);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedType(null);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedType(null);
    setName('');
    setTask('');
    setUploadedFile(null);
    setCreating(false);
    onClose();
  };

  const handleCreate = async () => {
    const pid = projectId || defaultProjectId;
    if (!pid) {
      toast({ title: '请选择所属项目', variant: 'error' });
      return;
    }

    const needsUpload = selectedType === 'proto' || selectedType === 'table' || selectedType === 'report';
    if (needsUpload && !uploadedFile) {
      toast({ title: '请先上传文件', variant: 'error' });
      return;
    }

    setCreating(true);
    try {
      if (needsUpload && uploadedFile) {
        if (!name) setName(uploadedFile.name);
        toast({ title: '产物已创建', variant: 'success' });
      } else {
        await artifactsApi.create({
          name: name || `未命名${selectedType ? artTypes[selectedType as keyof typeof artTypes].label : '产物'}`,
          type: selectedType ? typeToApi[selectedType] || 'document' : 'document',
          projectId: pid,
          taskId: task || undefined,
          status: 'draft',
        });
        toast({ title: '产物已创建', variant: 'success' });
      }
      notifyDataChange('artifacts');
      handleClose();
    } catch {
      toast({ title: '创建失败', variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
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
        {/* Dialog */}
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
            transform: step === 1 ? 'translateY(0) scale(1)' : 'translateY(0) scale(1)',
            transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            {step === 2 && (
              <button
                onClick={handleBack}
                style={{
                  width: 28,
                  height: 28,
                  border: '1px solid var(--border-default)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  color: 'var(--ink-3)',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-raised)';
                  e.currentTarget.style.color = 'var(--ink)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--ink-3)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
            )}
            <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>
              {step === 1 ? '选择产物类型' : `新建${selectedType ? artTypes[selectedType as keyof typeof artTypes].label : ''}`}
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

          {/* Step indicator */}
          {step === 2 && selectedType && (
            <div style={{
              padding: '0 20px 8px',
              fontSize: 11,
              color: 'var(--ink-3)',
              fontFamily: "'Geist Mono', monospace",
            }}>
              步骤 2 / 2 — {artTypes[selectedType as keyof typeof artTypes].label}
            </div>
          )}

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
            {step === 1 ? (
              /* Type Selection Grid */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}>
                {Object.entries(artTypes).map(([key, info], index) => (
                  <div
                    key={key}
                    onClick={() => handleTypeSelect(key)}
                    style={{
                      padding: 16,
                      border: '1px solid var(--border-default)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      textAlign: 'center',
                      background: 'var(--surface)',
                      gridColumn: index === Object.keys(artTypes).length - 1 && Object.keys(artTypes).length % 3 === 2 ? '2 / 3' : undefined,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                      e.currentTarget.style.background = 'var(--canvas)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      margin: '0 auto 10px',
                      borderRadius: 8,
                      background: 'var(--surface-raised)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 150ms',
                      color: 'var(--ink-2)',
                    }}>
                      <div style={{ width: 16, height: 16 }}>{info.icon}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3, letterSpacing: '-0.01em' }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.3 }}>
                      {info.desc}
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedType ? (
              /* Type-specific Form */
              <div>
                {/* Artifact Name */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>
                    产物名称
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="输入产物名称"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-default)',
                      borderRadius: 8,
                      fontSize: 13,
                      fontFamily: "'Geist', sans-serif",
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

                {/* Type-specific content */}
                {selectedType === 'proto' && (
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
                        label="上传原型"
                        accept=".html, .zip"
                        hint="支持 .html / .zip"
                        onUpload={async (file) => {
                          const pid = projectId || defaultProjectId;
                          if (!pid) throw new Error('No project selected');
                          const res = await artifactsApi.upload(file, {
                            projectId: pid,
                            type: 'prototype',
                            taskId: task || undefined,
                          });
                          setUploadedFile({ id: res.data.id, name: res.data.name });
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
                                  name: folderName,
                                  type: 'prototype',
                                  taskId: task || undefined,
                                });
                                setUploadedFile({ id: res.data.id, name: res.data.name });
                                setName(folderName);
                                toast({ title: `文件夹已上传 (${files.length} 个文件)`, variant: 'success' });
                              } catch {
                                toast({ title: '上传失败', variant: 'error' });
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
                )}

                {selectedType === 'flow' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>
                      绘图方式
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      background: 'var(--canvas)',
                      borderRadius: 12,
                      border: '1px solid var(--border-default)',
                    }}>
                      <div style={{ width: 22, height: 22, color: 'var(--ink-3)', flexShrink: 0 }}>
                        {artTypes.flow.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>Excalidraw 绘图区</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>创建后进入在线绘图编辑器</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedType === 'doc' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>
                      写作方式
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      background: 'var(--canvas)',
                      borderRadius: 12,
                      border: '1px solid var(--border-default)',
                    }}>
                      <div style={{ width: 22, height: 22, color: 'var(--ink-3)', flexShrink: 0 }}>
                        {artTypes.doc.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>Notion 写作区</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>创建后进入富文本编辑器</div>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedType === 'table' || selectedType === 'report') && (
                  <div style={{ marginBottom: 16 }}>
                    <FileUpload
                      label="上传文件"
                      hint="支持常见文件格式"
                      onUpload={async (file) => {
                        const pid = projectId || defaultProjectId;
                        if (!pid) throw new Error('No project selected');
                        const res = await artifactsApi.upload(file, {
                          projectId: pid,
                          type: selectedType === 'table' ? 'spreadsheet' : 'report',
                          taskId: task || undefined,
                        });
                        setUploadedFile({ id: res.data.id, name: res.data.name });
                      }}
                    />
                  </div>
                )}

                {/* Related Task */}
                <div style={{ marginBottom: 16 }}>
                  <Select
                    label="关联任务"
                    placeholder={tasks.length > 0 ? "选择关联任务" : "当前项目暂无任务"}
                    value={task}
                    onValueChange={setTask}
                    options={tasks.map(t => ({ value: t.id, label: t.title }))}
                  />
                </div>
              </div>
            ) : null}
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
            {step === 1 ? null : (
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--ink)',
                  color: 'var(--canvas)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.6 : 1,
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={(e) => { if (!creating) e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = creating ? '0.6' : '1'; }}
              >
                {creating ? '创建中...' : '创建'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
