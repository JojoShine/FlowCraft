import { prisma } from '../../lib/prisma';
import { search, type SearchResult } from '../vectorstore';
import { chatStream, type ChatMessage } from '../llm';

const SYSTEM_PROMPT = `你是 FlowCraft 的 AI 助手，一个面向独立开发者的项目管理智能助理。

你的职责：
- 基于项目数据回答关于任务、产物、进度、报告的问题
- 提供项目分析、进度总结、快捷操作建议
- 回答简洁专业，使用中文
- 列出数据时确保完整，不要遗漏

--- 项目概况 ---
{projectContext}
--- 项目概况结束 ---

以下是为回答问题所检索到的数据，请基于这些信息回答用户的问题。

--- 数据 ---
{context}
--- 数据结束 ---`;

async function buildProjectContext(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      name: true, type: true, status: true, description: true,
      startDate: true, endDate: true,
      phases: { orderBy: { order: 'asc' }, select: { name: true, order: true } },
      _count: { select: { tasks: true, artifacts: true, reports: true } },
    },
  });
  if (!project) return '（未找到项目信息）';

  const statusLabels: Record<string, string> = {
    discovery: '项目线索', research: '调研梳理', design: '方案设计',
    prototype: '原型设计', development: '开发实施', testing: '测试交付',
    completed: '复盘归档',
  };

  const lines = [
    `项目名称：${project.name}`,
    `项目类型：${project.type}`,
    `当前状态：${statusLabels[project.status] || project.status}`,
  ];
  if (project.description) lines.push(`项目描述：${project.description}`);
  lines.push(`\n阶段列表：${project.phases.map(p => p.name).join(' → ')}`);
  lines.push(`数据统计：${project._count.tasks} 个任务、${project._count.artifacts} 个产物、${project._count.reports} 份报告`);

  return lines.join('\n');
}

interface StructuredResult {
  label: string;
  items: string[];
}

async function structuredQuery(query: string, projectId: string): Promise<StructuredResult | null> {
  const isTaskQuery = /任务/.test(query);
  const isReportQuery = /日报|周报|月报|报告/.test(query);
  const isArtifactQuery = /产物|交付物|文档|设计稿/.test(query);
  const isListQuery = /列出|有哪些|所有|多少|汇总|整理|哪些|帮我找|查一下|显示/.test(query);

  const isOverdueQuery = /逾期|过期|超时|到期/.test(query);
  const isUpcomingQuery = /即将到期|快到期|本周到期|最近到期|即将截止/.test(query);

  if (isTaskQuery && (isOverdueQuery || isUpcomingQuery)) {
    const now = new Date();
    const where: Record<string, unknown> = {
      projectId,
      completedAt: null,
    };

    if (isOverdueQuery && isUpcomingQuery) {
      const weekLater = new Date(now);
      weekLater.setDate(weekLater.getDate() + 7);
      where.dueDate = { lte: weekLater };
    } else if (isOverdueQuery) {
      where.dueDate = { lt: now };
    } else {
      const weekLater = new Date(now);
      weekLater.setDate(weekLater.getDate() + 7);
      where.dueDate = { gte: now, lte: weekLater };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      select: {
        title: true, priority: true, status: true, column: true,
        dueDate: true, description: true,
      },
    });

    if (tasks.length === 0) {
      const label = isOverdueQuery && isUpcomingQuery ? '逾期及即将到期任务查询'
        : isOverdueQuery ? '逾期任务查询' : '即将到期任务查询';
      return { label, items: ['（没有符合条件的任务）'] };
    }

    const items = tasks.map(t => {
      const daysLeft = t.dueDate ? Math.ceil((new Date(t.dueDate).getTime() - now.getTime()) / 86400000) : null;
      const parts = [
        `${t.title}`,
        `优先级: ${t.priority}`,
        t.dueDate ? `截止: ${new Date(t.dueDate).toISOString().slice(0, 10)}${daysLeft !== null ? ` (${daysLeft < 0 ? `已逾期${-daysLeft}天` : daysLeft === 0 ? '今天到期' : `剩余${daysLeft}天`})` : ''}` : '',
        t.description ? `描述: ${t.description.slice(0, 100)}` : '',
      ].filter(Boolean);
      return parts.join(' | ');
    });

    const label = isOverdueQuery && isUpcomingQuery
      ? `逾期及即将到期任务（共 ${tasks.length} 条）`
      : isOverdueQuery
        ? `逾期任务（共 ${tasks.length} 条）`
        : `即将到期任务（共 ${tasks.length} 条）`;
    return { label, items };
  }

  if (isListQuery && isTaskQuery) {
    const where: Record<string, unknown> = { projectId };
    if (/未完成|还没完成|没完成|待完成/.test(query)) where.completedAt = null;
    if (/已完成|完成/.test(query) && !/未完成/.test(query)) where.completedAt = { not: null };
    if (/高优先级|紧急|优先级高|priority.*high/i.test(query)) where.priority = 'high';
    if (/中优先级/i.test(query)) where.priority = 'medium';
    if (/低优先级/i.test(query)) where.priority = 'low';

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        title: true, priority: true, status: true, column: true,
        completedAt: true, dueDate: true, description: true,
      },
    });

    if (tasks.length === 0) return { label: '任务查询结果', items: ['（没有找到符合条件的任务）'] };

    const items = tasks.map(t => {
      const parts = [
        `【${t.column === 'done' ? '已完成' : '未完成'}】${t.title}`,
        `优先级: ${t.priority}`,
        t.dueDate ? `截止: ${new Date(t.dueDate).toISOString().slice(0, 10)}` : '',
        t.description ? `描述: ${t.description.slice(0, 100)}` : '',
      ].filter(Boolean);
      return parts.join(' | ');
    });

    return { label: `任务查询（共 ${tasks.length} 条）`, items };
  }

  if (isListQuery && isReportQuery) {
    const where: Record<string, unknown> = { projectId };
    if (/日报/.test(query)) where.type = 'daily';
    else if (/周报/.test(query)) where.type = 'weekly';
    else if (/月报/.test(query)) where.type = 'monthly';

    const reports = await prisma.report.findMany({
      where,
      orderBy: { date: 'desc' },
      select: { label: true, type: true, date: true, content: true },
    });

    if (reports.length === 0) return { label: '报告查询结果', items: ['（没有找到符合条件的报告）'] };

    const items = reports.map(r => {
      const dateStr = r.date ? new Date(r.date).toISOString().slice(0, 10) : '';
      const typeLabel = r.type === 'daily' ? '日报' : r.type === 'weekly' ? '周报' : r.type === 'monthly' ? '月报' : r.type;
      const parts = [`[${typeLabel}] ${r.label}`];
      if (dateStr) parts.push(`日期: ${dateStr}`);
      if (r.content) parts.push(`内容: ${r.content.slice(0, 300)}`);
      return parts.join('\n');
    });

    return { label: `报告查询（共 ${reports.length} 份）`, items };
  }

  if (isListQuery && isArtifactQuery) {
    const artifacts = await prisma.artifact.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { name: true, type: true, status: true, content: true },
    });

    if (artifacts.length === 0) return { label: '产物查询结果', items: ['（没有找到产物）'] };

    const items = artifacts.map(a => {
      const parts = [`产物: ${a.name}`, `类型: ${a.type}`, `状态: ${a.status}`];
      if (a.content) parts.push(`内容: ${a.content.slice(0, 200)}`);
      return parts.join('\n');
    });

    return { label: `产物查询（共 ${artifacts.length} 个）`, items };
  }

  return null;
}

export async function* runRAG(query: string, projectId: string | undefined, history: ChatMessage[]) {
  let projectContext = '（无项目上下文）';
  let contextText = '';
  let sources: SearchResult[] = [];

  if (projectId) {
    const [ctx, structured] = await Promise.all([
      buildProjectContext(projectId),
      structuredQuery(query, projectId),
    ]);
    projectContext = ctx;

    if (structured) {
      contextText = `## ${structured.label}\n${structured.items.join('\n\n')}`;
    } else {
      const results = await search(query, projectId, 15);
      sources = results;
      contextText = formatVectorResults(results);
    }
  } else {
    const results = await search(query, undefined, 15);
    sources = results;
    contextText = formatVectorResults(results);
  }

  const systemPrompt = SYSTEM_PROMPT
    .replace('{projectContext}', projectContext)
    .replace('{context}', contextText || '（未检索到相关内容）');

  yield { type: 'sources', sources };

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];
  yield* chatStream(messages);
  yield { type: 'done' };
}

function formatVectorResults(sources: SearchResult[]): string {
  if (sources.length === 0) return '';

  const typeLabels: Record<string, string> = {
    task: '任务', report: '报告', artifact: '产物', phase: '阶段',
  };

  return sources.map((s, i) => {
    const meta = s.metadata;
    const type = meta.sourceType as string;
    const label = typeLabels[type] || type;
    const name = meta.title || meta.name || meta.label || '';
    return `${i + 1}. [${label}] ${name}\n${s.text}`;
  }).join('\n\n');
}
