import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';

const MONGO_URI = 'mongodb://admin:Xiaz123579...@121.196.245.95:27017/project_manager?authSource=admin';
const prisma = new PrismaClient();

const PRIORITY_MAP: Record<string, string> = { low: 'low', medium: 'med', high: 'high', urgent: 'high' };
const STATUS_TO_COLUMN: Record<string, string> = { todo: 'todo', in_progress: 'doing', review: 'review', completed: 'done' };

async function migrate() {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('project_manager');

  // Clean
  await prisma.report.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.task.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.project.deleteMany();
  console.log('Cleaned');

  // User
  let user = await prisma.user.findFirst();
  if (!user) user = await prisma.user.create({ data: { email: 'admin@flowcraft.local', name: 'Admin' } });

  // Projects — skip archived
  const mongoProjects = await db.collection('projects').find({ isArchived: { $ne: true } }).toArray();
  const projectIdMap = new Map<string, string>();
  for (const mp of mongoProjects) {
    const fcStatus = mp.status === 'completed' ? 'completed' : 'active';
    const created = await prisma.project.create({
      data: {
        name: mp.name, type: 'custom', description: mp.description || null,
        status: fcStatus, progress: 0,
        startDate: mp.startDate ? new Date(mp.startDate) : null,
        endDate: mp.endDate ? new Date(mp.endDate) : null,
        ownerId: user.id,
      },
    });
    projectIdMap.set(mp._id.toString(), created.id);
  }
  console.log(`Projects: ${mongoProjects.length} (excluded archived)`);

  // Build task→project mapping
  const reports = await db.collection('reports').find().toArray();
  const taskProjectMap = new Map<string, string>();
  for (const r of reports) {
    if (r.projects) for (const rp of r.projects) {
      if (rp.completedTasks) for (const t of rp.completedTasks) {
        if (t.taskId && rp.projectId) taskProjectMap.set(t.taskId.toString(), rp.projectId.toString());
      }
    }
  }
  const docs = await db.collection('documents').find({ project: { $exists: true, $ne: null }, relatedTasks: { $exists: true, $ne: [] } }).toArray();
  for (const d of docs) {
    if (d.relatedTasks && d.project) for (const tid of d.relatedTasks) taskProjectMap.set(tid.toString(), d.project.toString());
  }

  const otherProjectId = projectIdMap.get(
    (await db.collection('projects').findOne({ name: '其他', isArchived: { $ne: true } })) ?._id.toString() || ''
  );

  // Tasks — skip archived
  const mongoTasks = await db.collection('tasks').find({ isArchived: { $ne: true } }).toArray();
  let taskCreated = 0, toOther = 0, skipped = 0;
  for (const mt of mongoTasks) {
    let fcProjectId = projectIdMap.get(taskProjectMap.get(mt._id.toString()) || '') || null;
    if (!fcProjectId && otherProjectId) { fcProjectId = otherProjectId; toOther++; }
    if (!fcProjectId) { skipped++; continue; }

    await prisma.task.create({
      data: {
        title: mt.title, description: mt.description || null,
        type: mt.type || 'development',
        priority: PRIORITY_MAP[mt.priority] || 'med',
        status: mt.status || 'todo',
        column: STATUS_TO_COLUMN[mt.status] || 'todo',
        startDate: mt.startDate ? new Date(mt.startDate) : mt.beginDate ? new Date(mt.beginDate) : null,
        dueDate: mt.dueDate ? new Date(mt.dueDate) : null,
        projectId: fcProjectId, isMilestone: false,
      },
    });
    taskCreated++;
  }
  console.log(`Tasks: ${taskCreated} created, ${toOther} to "其他", ${skipped} skipped (excluded archived)`);

  // Phases
  const fcProjects = await prisma.project.findMany();
  for (const proj of fcProjects) {
    const phase = await prisma.phase.create({
      data: { projectId: proj.id, name: '开发实施', order: 1, status: proj.status === 'completed' ? 'done' : 'active', startDate: proj.startDate, endDate: proj.endDate },
    });
    const r = await prisma.task.updateMany({ where: { projectId: proj.id, phaseId: null }, data: { phaseId: phase.id } });
    if (r.count > 0) console.log(`  ${proj.name}: ${r.count} tasks`);
  }

  // Reports
  let reportCreated = 0, reportSkipped = 0;
  for (const mr of reports) {
    const reportDate = mr.period?.startDate ? new Date(mr.period.startDate) : new Date(mr.createdAt);
    if (mr.projects && Array.isArray(mr.projects)) {
      for (const rp of mr.projects) {
        const fcProjectId = projectIdMap.get(rp.projectId?.toString() || '');
        if (!fcProjectId) { reportSkipped++; continue; }
        const tasks = rp.completedTasks || [];
        const taskLines = tasks.map((t: any) => `- ${t.title}${t.description ? ` - ${t.description}` : ''}`).join('\n');
        let content = '';
        if (taskLines) content += `## 完成任务\n${taskLines}\n`;
        if (rp.aiSummary) content += `\n## 总结\n${rp.aiSummary}\n`;
        if (rp.aiSuggestions) content += `\n## 建议\n${rp.aiSuggestions}\n`;
        if (!content) content = mr.title || '日报';
        const existing = await prisma.report.findFirst({ where: { projectId: fcProjectId, date: reportDate, type: mr.type || 'daily' } });
        if (existing) { reportSkipped++; continue; }
        await prisma.report.create({ data: { type: mr.type || 'daily', label: mr.title || '日报', content, date: reportDate, projectId: fcProjectId } });
        reportCreated++;
      }
    } else reportSkipped++;
  }
  console.log(`Reports: ${reportCreated} created, ${reportSkipped} skipped`);

  // Summary
  const cols = await prisma.task.groupBy({ by: ['column'], _count: true });
  console.log('\nFinal:', { projects: await prisma.project.count(), tasks: await prisma.task.count(), reports: await prisma.report.count() });
  console.log('Columns:', cols);

  await mongo.close();
}

migrate().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
