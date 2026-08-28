import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { utc8DayRange, utc8MonthRange, utc8WeekRange, getCSTComponents } from '../lib/timezone';
import { chatComplete, ChatMessage } from '../ai/llm';

function buildDailyLabel(date: Date): string {
  const { year, month, day } = getCSTComponents(date);
  return `${year}年${month}月${day}日 工作日报`;
}

function buildWeeklyLabel(weekEnd: Date): string {
  const thursday = new Date(weekEnd);
  thursday.setDate(thursday.getDate() - 3);
  const { year, month, day } = getCSTComponents(thursday);
  const weekNum = Math.ceil(day / 7);
  return `${year}年${month}月第${weekNum}周 工作周报`;
}

function buildMonthlyLabel(date: Date): string {
  const { year, month } = getCSTComponents(date);
  return `${year}年${month}月 工作月报`;
}

function buildYearlyLabel(start: Date, end: Date): string {
  const s = getCSTComponents(start);
  const e = getCSTComponents(end);
  return `${s.year}年${s.month}月${s.day}日 - ${e.year}年${e.month}月${e.day}日 工作年报`;
}

function buildReportDate(type: string, date: Date): Date {
  if (type === 'monthly') {
    const { year, month } = getCSTComponents(date);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return utc8DayRange(year, month, lastDay).start;
  }
  return date;
}

async function queryTasksForPeriod(projectId: string, start: Date, end: Date) {
  const completed = await prisma.task.findMany({
    where: {
      projectId,
      column: 'done',
      completedAt: { gte: start, lte: end },
    },
    orderBy: { completedAt: 'asc' },
    select: { title: true },
  });

  return {
    completed: completed.map(t => t.title),
    nextSteps: [] as string[],
    issues: [] as string[],
  };
}

async function generateSummary(
  projectName: string,
  type: string,
  periodLabel: string,
  tasks: { completed: string[]; nextSteps: string[]; issues: string[] },
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: `请为项目「${projectName}」的${periodLabel}生成一段简要概述（2-4句话）。

已完成任务：${tasks.completed.length > 0 ? tasks.completed.join('、') : '无'}
进行中任务：${tasks.nextSteps.length > 0 ? tasks.nextSteps.join('、') : '无'}
逾期任务：${tasks.issues.length > 0 ? tasks.issues.join('、') : '无'}

只输出概述文字，不要输出标题或额外格式。`,
    },
  ];

  return chatComplete(messages);
}

export const reportService = {
  async list(filters?: { projectId?: string; type?: string; year?: number; month?: number; ownerId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.type) where.type = filters.type;
    if (filters?.ownerId && !filters?.projectId) where.project = { ownerId: filters.ownerId };
    if (filters?.year && filters?.month) {
      const { start, end } = utc8MonthRange(filters.year, filters.month);
      where.date = { gte: start, lte: end };
    }
    return prisma.report.findMany({ where, orderBy: { date: 'desc' } });
  },

  async getById(id: string) {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw AppError.notFound('Report not found');
    return report;
  },

  async create(data: { type: string; label: string; content: string; date: string; projectId: string }) {
    if (!data.type || !data.label || !data.content || !data.date || !data.projectId) {
      throw AppError.badRequest('type, label, content, date, and projectId are required');
    }
    return prisma.report.create({
      data: {
        type: data.type,
        label: data.label,
        content: data.content,
        date: new Date(data.date),
        projectId: data.projectId,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Report not found');
    await prisma.report.delete({ where: { id } });
  },

  async generate(params: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    projectId: string;
    date?: string;
    weekStart?: string;
  }) {
    const { type, projectId } = params;
    const now = new Date();

    let rangeStart: Date;
    let rangeEnd: Date;
    let label: string;
    let reportDate: Date;

    switch (type) {
      case 'daily': {
        const d = params.date ? new Date(params.date) : now;
        const comp = getCSTComponents(d);
        const range = utc8DayRange(comp.year, comp.month, comp.day);
        rangeStart = range.start;
        rangeEnd = range.end;
        label = buildDailyLabel(d);
        reportDate = buildReportDate('daily', d);
        break;
      }
      case 'weekly': {
        let monday: Date;
        if (params.weekStart) {
          monday = new Date(params.weekStart);
        } else {
          const cstComp = getCSTComponents(now);
          const cstDow = new Date(Date.UTC(cstComp.year, cstComp.month - 1, cstComp.day)).getUTCDay();
          const dayOfWeek = cstDow || 7;
          const friday = new Date(Date.UTC(cstComp.year, cstComp.month - 1, cstComp.day + (5 - dayOfWeek)));
          monday = new Date(friday);
          monday.setDate(monday.getDate() - 4);
        }
        const friday = new Date(monday);
        friday.setDate(friday.getDate() + 4);
        const range = utc8WeekRange(monday.getFullYear(), monday);
        rangeStart = range.start;
        rangeEnd = range.end;
        label = buildWeeklyLabel(friday);
        reportDate = friday;
        break;
      }
      case 'monthly': {
        const targetMonth = params.date ? new Date(params.date) : now;
        const comp = getCSTComponents(targetMonth);
        const lastDay = new Date(Date.UTC(comp.year, comp.month, 0)).getUTCDate();
        const range = utc8MonthRange(comp.year, comp.month);
        rangeStart = range.start;
        rangeEnd = range.end;
        label = buildMonthlyLabel(targetMonth);
        reportDate = utc8DayRange(comp.year, comp.month, lastDay).start;
        break;
      }
      case 'yearly': {
        const endDate = params.date ? new Date(params.date) : now;
        const startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        rangeStart = startDate;
        rangeEnd = endDate;
        label = buildYearlyLabel(startDate, endDate);
        reportDate = endDate;
        break;
      }
      default:
        throw AppError.badRequest('Invalid report type');
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw AppError.notFound('Project not found');

    const tasks = await queryTasksForPeriod(projectId, rangeStart, rangeEnd);

    if (type === 'daily' && tasks.completed.length === 0) {
      return null;
    }

    const summary = await generateSummary(project.name, type, label, tasks);

    const content = JSON.stringify({
      summary,
      completed: tasks.completed,
      issues: tasks.issues,
      nextSteps: tasks.nextSteps,
    });

    const cstComp = getCSTComponents(reportDate);
    const { start: dayStart } = utc8DayRange(cstComp.year, cstComp.month, cstComp.day);

    return prisma.report.upsert({
      where: { type_projectId_date: { type, projectId, date: dayStart } },
      update: { label, content },
      create: { type, label, content, date: dayStart, projectId },
    });
  },
};
