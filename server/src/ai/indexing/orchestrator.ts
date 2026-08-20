import { prisma } from '../../lib/prisma';
import { splitText } from '../chunking';
import { addDocuments, deleteByProject, type VectorDoc } from '../vectorstore';

function buildId(sourceType: string, sourceId: string, chunkIndex: number) {
  return `${sourceType}:${sourceId}:${chunkIndex}`;
}

async function indexTasks(projectId: string): Promise<VectorDoc[]> {
  const tasks = await prisma.task.findMany({ where: { projectId } });
  const docs: VectorDoc[] = [];

  for (const task of tasks) {
    const isDone = !!task.completedAt;
    const parts = [
      `任务: ${task.title}`,
      task.description ? `描述: ${task.description}` : '',
      `类型: ${task.type}`,
      `优先级: ${task.priority}`,
      `完成状态: ${isDone ? '已完成' : '未完成'}`,
      `看板列: ${task.column}`,
      task.dueDate ? `截止日期: ${new Date(task.dueDate).toISOString().slice(0, 10)}` : '',
    ].filter(Boolean);
    const text = parts.join('\n');
    const chunks = await splitText(text);

    for (const chunk of chunks) {
      docs.push({
        id: buildId('task', task.id, chunk.index),
        text: chunk.text,
        metadata: {
          sourceType: 'task',
          sourceId: task.id,
          projectId,
          title: task.title,
          status: task.status,
          priority: task.priority,
          isDone,
          chunkIndex: chunk.index,
        },
      });
    }
  }
  return docs;
}

async function indexArtifacts(projectId: string): Promise<VectorDoc[]> {
  const artifacts = await prisma.artifact.findMany({ where: { projectId } });
  const docs: VectorDoc[] = [];

  for (const art of artifacts) {
    const parts = [
      `产物: ${art.name}`,
      `类型: ${art.type}`,
      `状态: ${art.status}`,
    ];
    if (art.content) parts.push(`内容: ${art.content}`);
    const text = parts.join('\n');
    const chunks = await splitText(text);

    for (const chunk of chunks) {
      docs.push({
        id: buildId('artifact', art.id, chunk.index),
        text: chunk.text,
        metadata: {
          sourceType: 'artifact',
          sourceId: art.id,
          projectId,
          name: art.name,
          type: art.type,
          status: art.status,
          chunkIndex: chunk.index,
        },
      });
    }
  }
  return docs;
}

async function indexPhases(projectId: string): Promise<VectorDoc[]> {
  const phases = await prisma.phase.findMany({ where: { projectId } });
  const docs: VectorDoc[] = [];

  for (const phase of phases) {
    const text = `阶段: ${phase.name}\n排序: ${phase.order}`;
    docs.push({
      id: buildId('phase', phase.id, 0),
      text,
      metadata: {
        sourceType: 'phase',
        sourceId: phase.id,
        projectId,
        name: phase.name,
        chunkIndex: 0,
      },
    });
  }
  return docs;
}

async function indexProject(projectId: string): Promise<VectorDoc[]> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return [];

  const parts = [
    `项目: ${project.name}`,
    `类型: ${project.type}`,
    `状态: ${project.status}`,
  ];
  if (project.description) parts.push(`描述: ${project.description}`);
  const text = parts.join('\n');

  return [{
    id: buildId('project', project.id, 0),
    text,
    metadata: {
      sourceType: 'project',
      sourceId: project.id,
      projectId,
      name: project.name,
      chunkIndex: 0,
    },
  }];
}

async function indexReports(projectId: string): Promise<VectorDoc[]> {
  const reports = await prisma.report.findMany({ where: { projectId } });
  const docs: VectorDoc[] = [];

  for (const report of reports) {
    const parts = [
      `报告: ${report.label}`,
      `类型: ${report.type}`,
    ];
    if (report.content) parts.push(`内容: ${report.content}`);
    const text = parts.join('\n');
    const chunks = await splitText(text);

    for (const chunk of chunks) {
      docs.push({
        id: buildId('report', report.id, chunk.index),
        text: chunk.text,
        metadata: {
          sourceType: 'report',
          sourceId: report.id,
          projectId,
          label: report.label,
          type: report.type,
          chunkIndex: chunk.index,
        },
      });
    }
  }
  return docs;
}

export async function indexProjectData(projectId: string) {
  await deleteByProject(projectId);

  const [projectDocs, phaseDocs, taskDocs, artifactDocs, reportDocs] = await Promise.all([
    indexProject(projectId),
    indexPhases(projectId),
    indexTasks(projectId),
    indexArtifacts(projectId),
    indexReports(projectId),
  ]);

  const allDocs = [...projectDocs, ...phaseDocs, ...taskDocs, ...artifactDocs, ...reportDocs];
  await addDocuments(allDocs);

  return {
    projectId,
    indexed: allDocs.length,
    breakdown: {
      project: projectDocs.length,
      phases: phaseDocs.length,
      tasks: taskDocs.length,
      artifacts: artifactDocs.length,
      reports: reportDocs.length,
    },
  };
}

export async function indexAllProjects() {
  const projects = await prisma.project.findMany({ select: { id: true } });
  const results = [];
  for (const p of projects) {
    const result = await indexProjectData(p.id);
    results.push(result);
  }
  return results;
}
