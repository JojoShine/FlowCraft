import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_MAP: Record<string, string> = {
  planning: 'discovery',
  active: 'discovery',
  design: 'design',
  development: 'development',
  testing: 'testing',
  completed: 'completed',
};

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, status: true },
  });

  for (const p of projects) {
    const newStatus = STATUS_MAP[p.status];
    if (newStatus && newStatus !== p.status) {
      await prisma.project.update({
        where: { id: p.id },
        data: { status: newStatus },
      });
      console.log(`[${p.name}] ${p.status} → ${newStatus}`);
    } else {
      console.log(`[${p.name}] ${p.status} (无需变更)`);
    }
  }

  console.log('\n完成');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
