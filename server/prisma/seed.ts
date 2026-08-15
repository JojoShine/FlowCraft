import { PrismaClient } from 'prisma/client';

const prisma = new PrismaClient();

const YEAR_OFFSET = new Date().getFullYear() - 2024;
function d(dateStr: string): Date {
  const date = new Date(dateStr);
  date.setFullYear(date.getFullYear() + YEAR_OFFSET);
  return date;
}

async function main() {
  // Create a sample user
  const user = await prisma.user.upsert({
    where: { id: 'seed-user-id' },
    update: {},
    create: {
      id: 'seed-user-id',
      email: 'demo@flowcraft.com',
      name: '演示用户',
      avatarUrl: '',
    },
  });

  console.log('Created user:', user);

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { id: 'proj-1' },
    update: {},
    create: {
      id: 'proj-1',
      name: '智慧医疗平台',
      type: 'healthcare',
      description: '构建全流程医疗服务系统，包括异地就医申请、医保结算、电子病历管理等核心功能模块。',
      status: 'design',
      progress: 65,
      startDate: d('2024-07-01'),
      endDate: d('2024-09-30'),
      ownerId: user.id,
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: 'proj-2' },
    update: {},
    create: {
      id: 'proj-2',
      name: '文旅数据看板',
      type: 'tourism',
      description: '实时可视化展示旅游行业关键指标，支持多维度数据分析和预测模型。',
      status: 'development',
      progress: 82,
      startDate: d('2024-06-15'),
      endDate: d('2024-08-31'),
      ownerId: user.id,
    },
  });

  const project3 = await prisma.project.upsert({
    where: { id: 'proj-3' },
    update: {},
    create: {
      id: 'proj-3',
      name: '跨境电商系统',
      type: 'ecommerce',
      description: '多语言、多币种支持的跨境购物平台，集成物流追踪和智能关税计算。',
      status: 'planning',
      progress: 35,
      startDate: d('2024-08-01'),
      endDate: d('2024-12-31'),
      ownerId: user.id,
    },
  });

  console.log('Created projects');

  // Create phases for project1
  const phases = [
    { id: 'phase-1', projectId: project1.id, name: '项目线索', order: 1, status: 'done', startDate: d('2024-07-15'), endDate: d('2024-07-20') },
    { id: 'phase-2', projectId: project1.id, name: '调研梳理', order: 2, status: 'done', startDate: d('2024-07-21'), endDate: d('2024-07-31') },
    { id: 'phase-3', projectId: project1.id, name: '方案设计', order: 3, status: 'done', startDate: d('2024-08-01'), endDate: d('2024-08-06') },
    { id: 'phase-4', projectId: project1.id, name: '原型设计', order: 4, status: 'done', startDate: d('2024-08-07'), endDate: d('2024-08-18') },
    { id: 'phase-5', projectId: project1.id, name: '开发实施', order: 5, status: 'active', startDate: d('2024-08-19'), endDate: null },
    { id: 'phase-6', projectId: project1.id, name: '测试交付', order: 6, status: 'upcoming', startDate: d('2024-09-29'), endDate: d('2024-10-10') },
    { id: 'phase-7', projectId: project1.id, name: '复盘归档', order: 7, status: 'upcoming', startDate: d('2024-10-11'), endDate: d('2024-10-20') },
    // Phases for project2
    { id: 'phase-8', projectId: project2.id, name: '需求调研', order: 1, status: 'done', startDate: d('2024-06-15'), endDate: d('2024-06-30') },
    { id: 'phase-9', projectId: project2.id, name: '方案设计', order: 2, status: 'done', startDate: d('2024-07-01'), endDate: d('2024-07-15') },
    { id: 'phase-10', projectId: project2.id, name: '开发实施', order: 3, status: 'active', startDate: d('2024-07-16'), endDate: null },
    { id: 'phase-11', projectId: project2.id, name: '测试上线', order: 4, status: 'upcoming', startDate: d('2024-08-15'), endDate: d('2024-08-31') },
    // Phases for project3
    { id: 'phase-12', projectId: project3.id, name: '项目线索', order: 1, status: 'done', startDate: d('2024-08-01'), endDate: d('2024-08-10') },
    { id: 'phase-13', projectId: project3.id, name: '调研梳理', order: 2, status: 'active', startDate: d('2024-08-11'), endDate: null },
    { id: 'phase-14', projectId: project3.id, name: '方案设计', order: 3, status: 'upcoming', startDate: d('2024-09-01'), endDate: d('2024-09-30') },
    { id: 'phase-15', projectId: project3.id, name: '开发实施', order: 4, status: 'upcoming', startDate: d('2024-10-01'), endDate: d('2024-11-30') },
    { id: 'phase-16', projectId: project3.id, name: '测试交付', order: 5, status: 'upcoming', startDate: d('2024-12-01'), endDate: d('2024-12-31') },
  ];

  for (const phase of phases) {
    await prisma.phase.upsert({
      where: { id: phase.id },
      update: {},
      create: phase,
    });
  }

  console.log('Created phases');

  // Create sample tasks
  const tasks = [
    // Phase 1: 项目线索
    { id: 'task-101', title: '确认项目建设目标与范围', type: 'review', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-07-16'), projectId: project1.id, phaseId: 'phase-1', isMilestone: true },
    { id: 'task-102', title: '收集甲方需求文档', type: 'document', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-07-18'), projectId: project1.id, phaseId: 'phase-1', isMilestone: false },
    { id: 'task-103', title: '明确项目干系人', type: 'requirement', priority: 'low', status: 'completed', column: 'done', dueDate: d('2024-07-20'), projectId: project1.id, phaseId: 'phase-1', isMilestone: false },
    // Phase 2: 调研梳理
    { id: 'task-201', title: '调研医保接口对接方案', type: 'research', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-07-23'), projectId: project1.id, phaseId: 'phase-2', isMilestone: false },
    { id: 'task-202', title: '梳理线上挂号业务流程', type: 'research', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-07-25'), projectId: project1.id, phaseId: 'phase-2', isMilestone: false },
    { id: 'task-203', title: '整理调研纪要 — 云药房模块', type: 'document', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-07-28'), projectId: project1.id, phaseId: 'phase-2', isMilestone: false },
    { id: 'task-204', title: '异地就医数据流分析', type: 'research', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-07-30'), projectId: project1.id, phaseId: 'phase-2', isMilestone: true },
    // Phase 3: 方案设计
    { id: 'task-301', title: '编写实施方案 v1.0', type: 'document', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-08-02'), projectId: project1.id, phaseId: 'phase-3', isMilestone: false },
    { id: 'task-302', title: '设计系统架构方案', type: 'design', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-08-04'), projectId: project1.id, phaseId: 'phase-3', isMilestone: false },
    { id: 'task-303', title: '整理功能清单与排期表', type: 'document', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-08-05'), projectId: project1.id, phaseId: 'phase-3', isMilestone: false },
    { id: 'task-304', title: '实施方案 v2.1 修订', type: 'document', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-08-06'), projectId: project1.id, phaseId: 'phase-3', isMilestone: true },
    // Phase 4: 原型设计
    { id: 'task-401', title: '完成智慧医院线上接入页面原型', type: 'prototype', priority: 'low', status: 'completed', column: 'done', dueDate: d('2024-08-12'), projectId: project1.id, phaseId: 'phase-4', isMilestone: false },
    { id: 'task-402', title: '编写南京医疗挂号模块接口文档', type: 'document', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-08-12'), projectId: project1.id, phaseId: 'phase-4', isMilestone: false },
    { id: 'task-403', title: '确认异地就医申请业务流程图', type: 'prototype', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-08-12'), projectId: project1.id, phaseId: 'phase-4', isMilestone: false },
    { id: 'task-404', title: '评审医保资讯列表页原型设计', type: 'review', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-08-13'), projectId: project1.id, phaseId: 'phase-4', isMilestone: true },
    { id: 'task-405', title: '更新项目实施方案第三章内容', type: 'document', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-08-14'), projectId: project1.id, phaseId: 'phase-4', isMilestone: false },
    { id: 'task-406', title: '对接医保接口 SDK', type: 'development', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-08-15'), projectId: project1.id, phaseId: 'phase-4', isMilestone: false },
    // Phase 5: 开发实施
    { id: 'task-501', title: '挂号模块后端接口开发', type: 'development', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-08-22'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    { id: 'task-502', title: '科室列表页面前端开发', type: 'development', priority: 'high', status: 'completed', column: 'done', dueDate: d('2024-08-25'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    { id: 'task-503', title: '医生排班数据模型设计', type: 'development', priority: 'med', status: 'completed', column: 'done', dueDate: d('2024-08-23'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    { id: 'task-504', title: '挂号接口与医保 SDK 对接', type: 'development', priority: 'high', status: 'inprogress', column: 'inprogress', dueDate: d('2024-08-28'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    { id: 'task-505', title: '单元测试 — 挂号模块', type: 'testing', priority: 'med', status: 'todo', column: 'todo', dueDate: d('2024-09-01'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    { id: 'task-506', title: '线上报到全流程开发', type: 'development', priority: 'high', status: 'inprogress', column: 'inprogress', dueDate: d('2024-09-05'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    { id: 'task-507', title: '预约时段管理功能', type: 'development', priority: 'high', status: 'todo', column: 'todo', dueDate: d('2024-09-08'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    { id: 'task-508', title: '首页快速入口开发', type: 'development', priority: 'med', status: 'todo', column: 'todo', dueDate: d('2024-09-10'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    { id: 'task-509', title: '前后端联调 — 报到流程', type: 'testing', priority: 'high', status: 'todo', column: 'todo', dueDate: d('2024-09-12'), projectId: project1.id, phaseId: 'phase-5', isMilestone: true },
    { id: 'task-510', title: '集成测试', type: 'testing', priority: 'med', status: 'todo', column: 'todo', dueDate: d('2024-09-15'), projectId: project1.id, phaseId: 'phase-5', isMilestone: false },
    // Project 2 tasks
    { id: 'task-601', title: '优化数据库查询性能', type: 'development', priority: 'low', status: 'inprogress', column: 'inprogress', dueDate: d('2024-08-18'), projectId: project2.id, phaseId: 'phase-10', isMilestone: false },
    { id: 'task-602', title: '更新API文档至v2.1版本', type: 'document', priority: 'med', status: 'inprogress', column: 'inprogress', dueDate: d('2024-08-17'), projectId: project2.id, phaseId: 'phase-10', isMilestone: false },
    { id: 'task-603', title: '数据看板前端页面开发', type: 'development', priority: 'high', status: 'todo', column: 'todo', dueDate: d('2024-08-20'), projectId: project2.id, phaseId: 'phase-10', isMilestone: false },
    { id: 'task-604', title: '景区客流数据接入', type: 'development', priority: 'high', status: 'todo', column: 'todo', dueDate: d('2024-08-22'), projectId: project2.id, phaseId: 'phase-10', isMilestone: false },
    // Project 3 tasks
    { id: 'task-701', title: '东南亚市场调研', type: 'research', priority: 'high', status: 'inprogress', column: 'inprogress', dueDate: d('2024-08-20'), projectId: project3.id, phaseId: 'phase-13', isMilestone: false },
    { id: 'task-702', title: '多币种支付方案评估', type: 'research', priority: 'high', status: 'todo', column: 'todo', dueDate: d('2024-08-25'), projectId: project3.id, phaseId: 'phase-13', isMilestone: true },
    { id: 'task-703', title: '国际物流对接方案', type: 'requirement', priority: 'med', status: 'todo', column: 'todo', dueDate: d('2024-08-28'), projectId: project3.id, phaseId: 'phase-13', isMilestone: false },
  ];

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: {},
      create: task,
    });
  }

  console.log('Created tasks');

  // Create sample artifacts
  const artifacts = [
    { id: 'artifact-1', name: '异地就医申请流程图 v2.3', type: 'diagram', status: 'approved', projectId: project1.id, taskId: 'task-403', creatorId: user.id },
    { id: 'artifact-2', name: '医保结算接口规范文档', type: 'spec', status: 'review', projectId: project1.id, taskId: 'task-402', creatorId: user.id },
    { id: 'artifact-3', name: '用户权限管理原型设计', type: 'prototype', status: 'draft', projectId: project1.id, creatorId: user.id },
    { id: 'artifact-5', name: '智慧医院线上接入原型', type: 'prototype', status: 'approved', projectId: project1.id, taskId: 'task-401', creatorId: user.id },
    { id: 'artifact-6', name: '挂号业务流程图', type: 'diagram', status: 'approved', projectId: project1.id, taskId: 'task-202', creatorId: user.id },
    { id: 'artifact-7', name: '实施方案 v2.1', type: 'document', status: 'approved', projectId: project1.id, taskId: 'task-304', creatorId: user.id },
    { id: 'artifact-8', name: '系统架构设计文档', type: 'document', status: 'approved', projectId: project1.id, taskId: 'task-302', creatorId: user.id },
    { id: 'artifact-9', name: '功能清单与排期表', type: 'spreadsheet', status: 'approved', projectId: project1.id, taskId: 'task-303', creatorId: user.id },
    { id: 'artifact-10', name: '调研纪要 — 医保接口对接', type: 'document', status: 'approved', projectId: project1.id, taskId: 'task-201', creatorId: user.id },
    { id: 'artifact-11', name: '干系人清单', type: 'spreadsheet', status: 'approved', projectId: project1.id, taskId: 'task-103', creatorId: user.id },
    { id: 'artifact-4', name: '数据库设计方案 v1.5', type: 'document', status: 'approved', projectId: project2.id, creatorId: user.id },
    { id: 'artifact-12', name: '挂号模块接口文档 v1', type: 'document', status: 'approved', projectId: project1.id, taskId: 'task-501', creatorId: user.id },
    { id: 'artifact-13', name: '科室列表页面 v1', type: 'prototype', status: 'review', projectId: project1.id, taskId: 'task-502', creatorId: user.id },
  ];

  for (const artifact of artifacts) {
    await prisma.artifact.upsert({
      where: { id: artifact.id },
      update: {},
      create: artifact,
    });
  }

  console.log('Created artifacts');

  // Create sample templates
  const templates = [
    {
      id: 'template-1',
      name: '需求文档模板',
      category: 'document',
      description: '标准化的需求文档模板',
      content: '# 需求文档\n\n## 背景\n## 目标\n## 功能列表',
      usageCount: 12,
    },
    {
      id: 'template-2',
      name: '技术方案模板',
      category: 'document',
      description: '技术实现方案标准模板',
      content: '# 技术方案\n\n## 架构设计\n## 技术选型\n## 实施计划',
      usageCount: 8,
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {},
      create: template,
    });
  }

  console.log('Created templates');

  // Create sample reports
  const reports = [
    {
      id: 'report-1',
      type: 'weekly',
      label: '周报',
      content: '本周完成了...',
      date: d('2024-08-12'),
      projectId: project1.id,
    },
    {
      id: 'report-2',
      type: 'milestone',
      label: '验收报告',
      content: '里程碑已完成...',
      date: d('2024-08-10'),
      projectId: project2.id,
    },
  ];

  for (const report of reports) {
    await prisma.report.upsert({
      where: { id: report.id },
      update: {},
      create: report,
    });
  }

  console.log('Created reports');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
