import { prisma } from '../../lib/prisma';
import type { ToolName } from './definitions';

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  contextProjectId?: string,
): Promise<string> {
  const projectId = (args.projectId as string) || contextProjectId;
  if (!projectId) return JSON.stringify({ error: '缺少 projectId，无法查询' });

  try {
    switch (name as ToolName) {
      case 'get_tasks': return JSON.stringify(await getTasks(args, projectId));
      case 'get_reports': return JSON.stringify(await getReports(args, projectId));
      case 'get_artifacts': return JSON.stringify(await getArtifacts(args, projectId));
      case 'get_project_overview': return JSON.stringify(await getProjectOverview(projectId));
      case 'get_phase_details': return JSON.stringify(await getPhaseDetails(projectId));
      default: return JSON.stringify({ error: `未知工具: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || '查询失败' });
  }
}

async function getTasks(args: Record<string, unknown>, projectId: string) {
  const where: Record<string, unknown> = { projectId };
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  if (args.completed === true) {
    where.status = 'completed';
  } else if (args.completed === false) {
    where.status = { not: 'completed' };
  }

  if (args.priority) where.priority = args.priority;
  if (args.column) where.column = args.column;
  if (args.keyword && typeof args.keyword === 'string') {
    where.title = { contains: args.keyword, mode: 'insensitive' };
  }

  if (args.overdue === true) {
    where.status = { not: 'completed' };
    where.dueDate = { lt: startOfToday };
  }

  if (typeof args.dueWithinDays === 'number') {
    const future = new Date(now);
    future.setDate(future.getDate() + (args.dueWithinDays as number));
    future.setHours(23, 59, 59, 999);
    where.status = { not: 'completed' };
    where.dueDate = { gte: startOfToday, lte: future };
  }

  const limit = typeof args.limit === 'number' ? Math.min(args.limit as number, 100) : 50;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { dueDate: 'asc' },
    select: {
      id: true, title: true, priority: true, status: true, column: true,
      dueDate: true, description: true, completedAt: true,
    },
    take: limit,
  });

  if (tasks.length === 0) return { count: 0, tasks: [], message: '没有找到符合条件的任务' };

  return {
    count: tasks.length,
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status === 'completed' ? '已完成' : '未完成',
      column: t.column,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null,
      daysLeft: t.dueDate ? Math.ceil((new Date(t.dueDate).getTime() - now.getTime()) / 86400000) : null,
      description: t.description ? t.description.slice(0, 150) : null,
    })),
  };
}

async function getReports(args: Record<string, unknown>, projectId: string) {
  const where: Record<string, unknown> = { projectId };
  if (args.type) where.type = args.type;
  if (args.keyword && typeof args.keyword === 'string') {
    where.OR = [
      { label: { contains: args.keyword, mode: 'insensitive' } },
      { content: { contains: args.keyword, mode: 'insensitive' } },
    ];
  }
  const limit = typeof args.limit === 'number' ? Math.min(args.limit as number, 50) : 20;

  const reports = await prisma.report.findMany({
    where,
    orderBy: { date: 'desc' },
    select: { label: true, type: true, date: true, content: true },
    take: limit,
  });

  const typeLabels: Record<string, string> = { daily: '日报', weekly: '周报', monthly: '月报', yearly: '年报' };

  if (reports.length === 0) return { count: 0, reports: [], message: '没有找到符合条件的报告' };

  return {
    count: reports.length,
    reports: reports.map(r => ({
      label: r.label,
      type: typeLabels[r.type] || r.type,
      date: r.date ? new Date(r.date).toISOString().slice(0, 10) : null,
      content: r.content ? r.content.slice(0, 500) : null,
    })),
  };
}

async function getArtifacts(args: Record<string, unknown>, projectId: string) {
  const where: Record<string, unknown> = { projectId };
  if (args.type) where.type = args.type;
  if (args.keyword && typeof args.keyword === 'string') {
    where.name = { contains: args.keyword, mode: 'insensitive' };
  }
  const limit = typeof args.limit === 'number' ? Math.min(args.limit as number, 100) : 50;

  const artifacts = await prisma.artifact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, type: true, status: true, content: true, createdAt: true },
    take: limit,
  });

  if (artifacts.length === 0) return { count: 0, artifacts: [], message: '没有找到产物' };

  return {
    count: artifacts.length,
    artifacts: artifacts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      content: a.content ? a.content.slice(0, 300) : null,
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : null,
    })),
  };
}

async function getProjectOverview(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      name: true, type: true, status: true, description: true,
      startDate: true, endDate: true,
      phases: { orderBy: { order: 'asc' }, select: { name: true, order: true } },
      _count: { select: { tasks: true, artifacts: true, reports: true } },
    },
  });

  if (!project) return { error: '未找到项目' };

  const statusLabels: Record<string, string> = {
    discovery: '项目线索', research: '调研梳理', design: '方案设计',
    prototype: '原型设计', development: '开发实施', testing: '测试交付',
    completed: '复盘归档',
  };

  return {
    name: project.name,
    type: project.type,
    status: statusLabels[project.status] || project.status,
    description: project.description || null,
    phases: project.phases.map(p => p.name),
    stats: {
      tasks: project._count.tasks,
      artifacts: project._count.artifacts,
      reports: project._count.reports,
    },
  };
}

async function getPhaseDetails(projectId: string) {
  const phases = await prisma.phase.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, order: true },
  });

  if (phases.length === 0) return { count: 0, phases: [], message: '该项目暂无阶段' };

  const phaseIds = phases.map(p => p.id);
  const [totalCounts, doneCounts] = await Promise.all([
    prisma.task.groupBy({
      by: ['phaseId'],
      where: { phaseId: { in: phaseIds } },
      _count: { id: true },
    }),
    prisma.task.groupBy({
      by: ['phaseId'],
      where: { phaseId: { in: phaseIds }, status: 'completed' },
      _count: { id: true },
    }),
  ]);

  const totalMap = Object.fromEntries(totalCounts.map(g => [g.phaseId, g._count.id]));
  const doneMap = Object.fromEntries(doneCounts.map(g => [g.phaseId, g._count.id]));

  return {
    count: phases.length,
    phases: phases.map(p => ({
      name: p.name,
      order: p.order,
      totalTasks: totalMap[p.id] || 0,
      completedTasks: doneMap[p.id] || 0,
    })),
  };
}
