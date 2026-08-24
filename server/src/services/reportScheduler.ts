import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { reportService } from './reportService';
import { logger } from '../lib/logger';

async function generateForAllProjects(type: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  logger.info(`Auto-generating ${type} reports for ${projects.length} projects`);

  for (const project of projects) {
    try {
      await reportService.generate({ type, projectId: project.id });
      logger.info(`Generated ${type} report for project: ${project.name}`);
    } catch (error) {
      logger.error(`Failed to generate ${type} report for project: ${project.name}`, { error: String(error) });
    }
  }
}

function isLastDayOfMonth(): boolean {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getDate() === 1;
}

export function startScheduler() {
  cron.schedule('30 17 * * *', () => {
    logger.info('Cron: generating daily reports (17:30)');
    generateForAllProjects('daily');
  });

  cron.schedule('0 22 * * *', () => {
    logger.info('Cron: generating daily reports (22:00)');
    generateForAllProjects('daily');
  });

  cron.schedule('0 18 * * 5', () => {
    logger.info('Cron: generating weekly reports (Friday 18:00)');
    generateForAllProjects('weekly');
  });

  cron.schedule('0 18 * * 0', () => {
    logger.info('Cron: generating weekly reports supplement (Sunday 18:00)');
    generateForAllProjects('weekly');
  });

  cron.schedule('0 18 28-31 * *', () => {
    if (!isLastDayOfMonth()) return;
    logger.info('Cron: generating monthly reports');
    generateForAllProjects('monthly');
  });

  cron.schedule('0 18 31 12 *', () => {
    logger.info('Cron: generating yearly reports');
    generateForAllProjects('yearly');
  });

  logger.info('Report scheduler started');
}
