import { prisma } from '../src/lib/prisma';
import { uploadFile } from '../src/lib/minio';
import htmlToDocx from 'html-to-docx';

async function main() {
  const htmlArtifacts = await prisma.artifact.findMany({
    where: { type: 'html', content: { not: null } },
    select: { id: true, name: true, projectId: true, content: true },
  });

  console.log(`Found ${htmlArtifacts.length} HTML artifacts to convert`);

  let success = 0;
  let failed = 0;

  for (const artifact of htmlArtifacts) {
    try {
      const docxBuffer = await htmlToDocx(artifact.content!) as Buffer;
      const timestamp = Date.now();
      const safeName = artifact.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectName = `${artifact.projectId}/migrated/${timestamp}-${safeName}.docx`;
      const filePath = await uploadFile(
        docxBuffer,
        objectName,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );

      await prisma.artifact.update({
        where: { id: artifact.id },
        data: { type: 'docx', filePath, content: null },
      });

      success++;
      console.log(`[${success}/${htmlArtifacts.length}] Converted: ${artifact.name}`);
    } catch (err) {
      failed++;
      console.log(`[FAILED] ${artifact.name}:`, (err as Error).message);
    }
  }

  console.log(`\nDone: ${success} converted, ${failed} failed`);
  await prisma.$disconnect();
}

main();
