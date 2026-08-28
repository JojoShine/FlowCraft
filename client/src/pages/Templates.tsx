import { useState, useEffect } from 'react';
import { templatesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { formatDate } from '../utils/date';
import type { Template } from '../types';

const fileTypeConfig: Record<string, { label: string; color: string }> = {
  html: { label: 'HTML', color: '#E65100' },
  word: { label: 'Word', color: '#1565C0' },
  markdown: { label: 'MD', color: '#2E7D32' },
};

const categoryOptions = ['需求', '技术', '测试', '文档', '设计', '运维'];

export function Templates() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await templatesApi.list();
      setTemplates(res.data);
    } catch (err: any) {
      addToast(err?.message || '加载模板失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await templatesApi.delete(deletingId);
      setTemplates(prev => prev.filter(t => t.id !== deletingId));
      addToast('模板已删除', 'success');
    } catch (err: any) {
      addToast(err?.message || '删除失败', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async (data: { name: string; category: string; description: string; content: string; fileType: string }) => {
    try {
      if (editingTemplate) {
        const res = await templatesApi.update(editingTemplate.id, data);
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? res.data : t));
        addToast('模板已更新', 'success');
      } else {
        const res = await templatesApi.create(data);
        setTemplates(prev => [res.data, ...prev]);
        addToast('模板已创建', 'success');
      }
      setShowDialog(false);
      setEditingTemplate(null);
    } catch (err: any) {
      addToast(err?.message || (editingTemplate ? '更新失败' : '创建失败'), 'error');
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setDrawerMode('create');
    setShowDialog(true);
  };

  const openView = (template: Template) => {
    setEditingTemplate(template);
    setDrawerMode('view');
    setShowDialog(true);
  };

  const openEdit = (template: Template) => {
    setEditingTemplate(template);
    setDrawerMode('edit');
    setShowDialog(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2 }}>文档模板</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>管理可复用的文档模板，支持 HTML / Word / Markdown</div>
        </div>
        {!isViewer && (
        <button
          onClick={openCreate}
          style={{
            height: 36,
            padding: '0 16px',
            borderRadius: 8,
            background: 'var(--ink)',
            color: 'var(--canvas)',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建模板
        </button>
        )}
      </div>

      {/* Template cards */}
      {templates.length === 0 ? (
        <div style={{
          fontSize: 13,
          color: 'var(--ink-3)',
          padding: '48px 0',
          textAlign: 'center',
          background: 'var(--canvas)',
          borderRadius: 12,
        }}>
          暂无模板，点击「新建模板」创建
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {templates.map((tpl) => {
            const ft = fileTypeConfig[tpl.fileType] || fileTypeConfig.html;
            return (
              <div
                key={tpl.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
                onClick={() => openView(tpl)}
              >
                {/* Top: icon + name + actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--surface-raised)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tpl.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tpl.description || '暂无描述'}
                    </div>
                  </div>
                  {!isViewer && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(tpl); }}
                      style={{
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', transition: 'all 150ms',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--ink)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                      style={{
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', transition: 'all 150ms',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--red) 8%, transparent)'; e.currentTarget.style.color = 'var(--red)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                  )}
                </div>

                {/* Bottom: badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 10,
                    color: 'var(--ink-2)',
                    padding: '1px 6px',
                    background: 'var(--surface-raised)',
                    borderRadius: 3,
                  }}>
                    {tpl.category}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                    color: ft.color,
                    padding: '1px 6px',
                    background: `color-mix(in srgb, ${ft.color} 8%, var(--surface-raised))`,
                    borderRadius: 3,
                  }}>
                    {ft.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    color: 'var(--ink-4)',
                    fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                  }}>
                    {tpl.updatedAt ? formatDate(tpl.updatedAt) : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
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
          onClick={() => setDeletingId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              padding: 24,
              width: 360,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>确认删除</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>删除后无法恢复，确定要删除这个模板吗？</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setDeletingId(null)}>取消</Button>
              <Button variant="danger" size="sm" onClick={confirmDelete}>删除</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit drawer */}
      <TemplateDrawer
        isOpen={showDialog}
        mode={drawerMode}
        template={editingTemplate}
        onSave={handleSave}
        onClose={() => { setShowDialog(false); setEditingTemplate(null); }}
        onSwitchToEdit={() => setDrawerMode('edit')}
        isViewer={isViewer}
      />
    </div>
  );
}

function TemplateDrawer({ isOpen, mode, template, onSave, onClose, onSwitchToEdit, isViewer }: {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'create';
  template: Template | null;
  onSave: (data: { name: string; category: string; description: string; content: string; fileType: string }) => void;
  onClose: () => void;
  onSwitchToEdit: () => void;
  isViewer?: boolean;
}) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || categoryOptions[0]);
  const [fileType, setFileType] = useState(template?.fileType || 'html');
  const [description, setDescription] = useState(template?.description || '');
  const [content, setContent] = useState(template?.content || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(template?.name || '');
      setCategory(template?.category || categoryOptions[0]);
      setFileType(template?.fileType || 'html');
      setDescription(template?.description || '');
      setContent(template?.content || '');
      setCopied(false);
    }
  }, [isOpen, template]);

  const handleSubmit = () => {
    if (!name.trim() || !content.trim()) return;
    onSave({ name: name.trim(), category, fileType, description: description.trim(), content });
  };

  const categoryOpts = categoryOptions.map(c => ({ value: c, label: c }));
  const fileTypeOpts = [
    { value: 'html', label: 'HTML' },
    { value: 'word', label: 'Word' },
    { value: 'markdown', label: 'Markdown' },
  ];

  if (!isOpen) return null;

  const isView = mode === 'view';
  const ft = fileTypeConfig[template?.fileType || 'html'] || fileTypeConfig.html;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay)',
          backdropFilter: 'blur(4px)',
          zIndex: 998,
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          background: 'var(--surface)',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          height: 56,
          padding: '0 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {isView ? '模板详情' : mode === 'edit' ? '编辑模板' : '新建模板'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isView && !isViewer && (
              <button
                onClick={onSwitchToEdit}
                style={{
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border-default)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ink-2)',
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                编辑
              </button>
            )}
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
                e.currentTarget.style.background = 'var(--surface-overlay)';
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isView ? (
            <>
              {/* View mode: read-only display */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, letterSpacing: '0.02em' }}>模板名称</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{template?.name}</div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, letterSpacing: '0.02em' }}>分类</div>
                  <span style={{
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    padding: '2px 8px',
                    background: 'var(--surface-raised)',
                    borderRadius: 4,
                  }}>
                    {template?.category}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, letterSpacing: '0.02em' }}>格式</div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
                    color: ft.color,
                    padding: '2px 8px',
                    background: `color-mix(in srgb, ${ft.color} 8%, var(--surface-raised))`,
                    borderRadius: 4,
                  }}>
                    {ft.label}
                  </span>
                </div>
              </div>

              {template?.description && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, letterSpacing: '0.02em' }}>描述</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>{template.description}</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.02em' }}>
                    模板内容
                    <span style={{ fontWeight: 400, marginLeft: 6 }}>
                      {template?.fileType === 'html' ? 'HTML' : template?.fileType === 'markdown' ? 'Markdown' : 'Word'}
                    </span>
                  </div>
                  {(template?.fileType === 'html' || template?.fileType === 'markdown') && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(template?.content || '');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      style={{
                        height: 24,
                        padding: '0 8px',
                        borderRadius: 5,
                        border: '1px solid var(--border-default)',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        color: copied ? 'var(--ink)' : 'var(--ink-3)',
                        transition: 'all 150ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--surface-raised)';
                        e.currentTarget.style.color = 'var(--ink)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = copied ? 'var(--ink)' : 'var(--ink-3)';
                      }}
                    >
                      {copied ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          已复制
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                          </svg>
                          复制
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 240,
                  padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.6,
                  fontFamily: template?.fileType === 'html' || template?.fileType === 'markdown' ? "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  color: 'var(--ink-2)',
                  background: 'var(--canvas)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflow: 'auto',
                }}>
                  {template?.content}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Edit / Create mode: form */}
              <Input label="模板名称" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入模板名称" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Select label="分类" value={category} onValueChange={setCategory} options={categoryOpts} />
                <Select label="格式" value={fileType} onValueChange={setFileType} options={fileTypeOpts} />
              </div>

              <Input label="描述" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简要描述模板用途" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>
                  模板内容
                  <span style={{ fontWeight: 400, color: 'var(--ink-3)', marginLeft: 6 }}>
                    {fileType === 'html' ? '支持 HTML 标签' : fileType === 'markdown' ? 'Markdown 语法' : 'Word 兼容内容'}
                  </span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={fileType === 'html' ? '<h1>标题</h1>\n<p>内容...</p>' : fileType === 'markdown' ? '# 标题\n\n内容...' : '输入模板内容...'}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: 240,
                    resize: 'vertical',
                    padding: '8px 12px',
                    border: '1px solid var(--border-default)',
                    borderRadius: 8,
                    fontSize: 12,
                    lineHeight: 1.6,
                    fontFamily: fileType === 'html' || fileType === 'markdown' ? "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: 'var(--ink)',
                    background: 'var(--surface)',
                    outline: 'none',
                    transition: 'border-color 150ms, box-shadow 150ms',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ink-3)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ink) 6%, transparent)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isView && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}>
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || !content.trim()}>
              {mode === 'edit' ? '保存' : '创建'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
