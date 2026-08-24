import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allArtifacts = await prisma.artifact.findMany({ select: { id: true, name: true, type: true } });
  console.log(`共 ${allArtifacts.length} 个产物需要迁移`);

  let folderCount = 0;
  let fileCount = 0;

  for (const a of allArtifacts) {
    let newType: string;

    if (a.type === 'prototype' || a.type === 'proto' || a.content) {
      newType = 'folder';
      folderCount++;
    } else {
      newType = 'file';
      fileCount++;
    }

    if (a.type !== newType) {
      await prisma.artifact.update({ where: { id: a.id }, data: { type: newType } });
      console.log(`  ${a.name}: ${a.type} → ${newType}`);
    }
  }

  console.log(`\n迁移完成: ${folderCount} 个文件夹, ${fileCount} 个文件`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
