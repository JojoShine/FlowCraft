import { useState, useEffect } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { DatePicker } from './DatePicker';
import { Button } from './Button';
import { useToast } from './Toast';
import { projectsApi, usersApi } from '../../services/api';
import { notifyDataChange } from '../../utils/dataEvents';
import type { User } from '../../types';

interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const projectTypeOptions = [
  { value: '政务应用', label: '政务应用' },
  { value: '后台管理系统', label: '后台管理系统' },
  { value: '小程序 / APP', label: '小程序 / APP' },
  { value: '数据看板', label: '数据看板' },
  { value: '商城系统', label: '商城系统' },
  { value: '医疗健康应用', label: '医疗健康应用' },
  { value: '自定义项目', label: '自定义项目' },
];

const phaseOptions = [
  { value: 'discovery', label: '项目线索' },
  { value: 'research', label: '调研梳理' },
  { value: 'design', label: '方案设计' },
  { value: 'prototype', label: '原型设计' },
  { value: 'development', label: '开发实施' },
  { value: 'testing', label: '测试交付' },
  { value: 'review', label: '复盘归档' },
];

function TagInput({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--ink-2)',
        letterSpacing: '-0.01em',
      }}>
        {label}
      </label>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          height: 36,
          padding: '0 12px',
          fontSize: 13,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: 'var(--ink)',
          background: 'var(--surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          outline: 'none',
          transition: 'all 150ms',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--ink-3)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,24,27,0.08)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map((tag, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                fontSize: 11,
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                background: 'var(--canvas)',
              }}
            >
              {tag}
              <button
                onClick={() => onRemove(i)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  color: 'var(--ink-3)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 12, height: 12 }}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--ink-3)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      margin: '8px 0 4px',
      paddingBottom: 8,
      borderBottom: '1px solid var(--border-default)',
    }}>
      {children}
    </div>
  );
}

export function ProjectDrawer({ isOpen, onClose }: ProjectDrawerProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState('政务应用');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [owner, setOwner] = useState('');
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [startPhase, setStartPhase] = useState('discovery');
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    usersApi.list().then((res) => {
      setUsers(res.data as User[]);
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: '请输入项目名称', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await projectsApi.create({
        name: name.trim(),
        type,
        description: description.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        ownerId: owner || null,
        startPhase,
      });
      notifyDataChange('projects');
      toast({ title: '项目已创建', variant: 'success' });
      onClose();
    } catch {
      toast({ title: '创建失败', description: '请检查网络连接', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

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
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
            新建项目
          </h3>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="项目名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入项目名称"
          />

          <Select
            label="项目类型"
            value={type}
            onValueChange={setType}
            options={projectTypeOptions}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink-2)',
              letterSpacing: '-0.01em',
            }}>
              项目描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述项目背景和目标..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                color: 'var(--ink)',
                background: 'var(--surface)',
                outline: 'none',
                resize: 'vertical',
                minHeight: 60,
                lineHeight: 1.5,
                transition: 'all 150ms',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--ink-3)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24,24,27,0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <SectionHeader>时间与周期</SectionHeader>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <DatePicker label="开始日期" value={startDate} onChange={setStartDate} />
            <DatePicker label="结束日期" value={endDate} onChange={setEndDate} />
          </div>

          <SectionHeader>团队与干系人</SectionHeader>

          <Select
            label="项目负责人"
            value={owner}
            onValueChange={setOwner}
            placeholder="选择负责人"
            options={users.map((u) => ({ value: u.id, label: u.name || u.email || '' }))}
          />

          <TagInput
            label="干系人"
            placeholder="输入干系人姓名，回车添加"
            tags={stakeholders}
            onAdd={(v) => setStakeholders([...stakeholders, v])}
            onRemove={(i) => setStakeholders(stakeholders.filter((_, idx) => idx !== i))}
          />

          <TagInput
            label="项目成员"
            placeholder="输入成员姓名，回车添加"
            tags={members}
            onAdd={(v) => setMembers([...members, v])}
            onRemove={(i) => setMembers(members.filter((_, idx) => idx !== i))}
          />

          <SectionHeader>阶段设置</SectionHeader>

          <Select
            label="起始阶段"
            value={startPhase}
            onValueChange={setStartPhase}
            options={phaseOptions}
          />

          {/* AI Bar */}
          <div style={{
            padding: 12,
            background: 'var(--canvas)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 16, height: 16, color: 'var(--ink-3)', flexShrink: 0 }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
            </svg>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>AI 可根据描述生成实施方案和任务拆解</span>
            <Button
              variant="secondary"
              size="sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => toast({ title: 'AI 正在生成...' })}
            >
              AI 生成
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
        }}>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button loading={submitting} onClick={handleSubmit}>创建项目</Button>
        </div>
      </div>
    </>
  );
}
