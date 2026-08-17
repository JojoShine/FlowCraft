import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PHASES = [
  '项目线索', '调研梳理', '方案设计', '原型设计',
  '开发实施', '测试交付', '复盘归档',
];

async function main() {
  const projects = await prisma.project.findMany({
    include: { phases: { orderBy: { order: 'asc' } } },
  });

  for (const project of projects) {
    const existingNames = new Set(project.phases.map(p => p.name));
    const maxOrder = project.phases.reduce((max, p) => Math.max(max, p.order), -1);
    const missing = DEFAULT_PHASES.filter(name => !existingNames.has(name));

    if (missing.length === 0) {
      console.log(`[${project.name}] 阶段完整，跳过`);
      continue;
    }

    let order = maxOrder + 1;
    for (const name of missing) {
      const idx = DEFAULT_PHASES.indexOf(name);
      await prisma.phase.create({
        data: {
          name,
          order: idx,
          projectId: project.id,
          status: 'upcoming',
        },
      });
      console.log(`  + ${name} (order: ${idx})`);
    }
    console.log(`[${project.name}] 补齐 ${missing.length} 个阶段`);
  }

  console.log('\n完成');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
