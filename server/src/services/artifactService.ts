import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { uploadFile, getFileStream as getMinIOStream, deleteFile } from '../lib/minio';
import { compressImage } from '../lib/imageCompress';
import { Readable } from 'stream';
import htmlToDocx from 'html-to-docx';
import { logger } from '../lib/logger';

function sanitizeHtmlForDocx(html: string): string {
  return html
    .replace(/style\s*=\s*"([^"]*)"/gi, (_m, s: string) =>
      'style="' + s.replace(/width\s*:\s*\d+(\.\d+)?%/gi, '') + '"',
    )
    .replace(/width\s*=\s*"(\d+(\.\d+)?%)"/gi, '');
}

async function tryConvertHtmlToDocx(
  html: string,
  projectId: string,
  artifactName: string,
): Promise<{ filePath: string } | null> {
  try {
    const sanitized = sanitizeHtmlForDocx(html);
    const docxBuffer = await htmlToDocx(sanitized) as Buffer;
    const timestamp = Date.now();
    const safeName = artifactName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectName = `${projectId}/ai-generated/${timestamp}-${safeName}.docx`;
    const filePath = await uploadFile(
      docxBuffer,
      objectName,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    return { filePath };
  } catch (err) {
    logger.warn('[artifactService] html→docx conversion failed, keeping as html', {
      projectId,
      name: artifactName,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export const artifactService = {
  async list(filters?: { projectId?: string; type?: string; keyword?: string; page?: number; pageSize?: number; ownerId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.type) where.type = filters.type;
    if (filters?.keyword) where.name = { contains: filters.keyword, mode: 'insensitive' };
    if (filters?.ownerId && !filters?.projectId) where.project = { ownerId: filters.ownerId };

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;

    const [data, total] = await Promise.all([
      prisma.artifact.findMany({
        where,
        include: {
          task: { select: { id: true, title: true } },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.artifact.count({ where }),
    ]);

    return { data, total, page, pageSize };
  },

  async getById(id: string) {
    const artifact = await prisma.artifact.findUnique({
      where: { id },
      include: {
        task: { select: { id: true, title: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    if (!artifact) throw AppError.notFound('Artifact not found');
    return artifact;
  },

  async create(data: {
    name: string;
    type: string;
    projectId: string;
    status?: string;
    filePath?: string;
    content?: string;
    taskId?: string;
    creatorId?: string;
  }) {
    if (!data.name || !data.type || !data.projectId) {
      throw AppError.badRequest('name, type, and projectId are required');
    }

    let { type, filePath, content } = data;

    if (type === 'html' && content) {
      const converted = await tryConvertHtmlToDocx(content, data.projectId, data.name);
      if (converted) {
        filePath = converted.filePath;
        type = 'docx';
        // content intentionally kept as the original HTML source — enables browser-based
        // PDF export (window.print) and keeps a human-readable fallback in the DB.
      }
    }

    return prisma.artifact.create({
      data: {
        name: data.name,
        type,
        status: data.status || 'draft',
        filePath,
        content,
        taskId: data.taskId,
        projectId: data.projectId,
        creatorId: data.creatorId,
      },
    });
  },

  async update(id: string, data: {
    name?: string;
    type?: string;
    status?: string;
    filePath?: string;
    content?: string;
    taskId?: string;
  }) {
    const existing = await prisma.artifact.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Artifact not found');

    const nextType = data.type ?? existing.type;
    const nextContent = data.content ?? existing.content;
    let nextFilePath = data.filePath ?? existing.filePath;
    let finalType = nextType;
    let finalContent: string | undefined | null = nextContent;

    if (nextType === 'html' && nextContent) {
      const converted = await tryConvertHtmlToDocx(nextContent, existing.projectId, data.name ?? existing.name);
      if (converted) {
        nextFilePath = converted.filePath;
        finalType = 'docx';
        finalContent = null;
        if (existing.filePath) {
          try { await deleteFile(existing.filePath); } catch { /* ignore */ }
        }
      }
    }

    return prisma.artifact.update({
      where: { id },
      data: {
        name: data.name,
        type: finalType,
        status: data.status,
        filePath: nextFilePath,
        content: finalContent,
        taskId: data.taskId,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.artifact.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Artifact not found');
    
    if (existing.filePath) {
      try {
        await deleteFile(existing.filePath);
      } catch (error) {
        console.error('[artifactService] Failed to delete file from MinIO:', error);
      }
    }
    
    await prisma.artifact.delete({ where: { id } });
  },

  async upload(
    file: Express.Multer.File,
    metadata: { projectId: string; taskId?: string; type?: string; name?: string }
  ) {
    if (!metadata.projectId) {
      throw AppError.badRequest('projectId is required');
    }

    const timestamp = Date.now();
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const taskDir = metadata.taskId || 'default';
    const objectName = `${metadata.projectId}/${taskDir}/${timestamp}-${safeFileName}`;

    const compressed = await compressImage(file.buffer, file.mimetype);
    const filePath = await uploadFile(compressed, objectName, file.mimetype);

    const artifactType = metadata.type || this.inferType(file.mimetype);
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const artifactName = metadata.name || decodedName;

    const artifact = await prisma.artifact.create({
      data: {
        name: artifactName,
        type: artifactType,
        status: 'approved',
        filePath,
        projectId: metadata.projectId,
        taskId: metadata.taskId,
      },
    });

    return artifact;
  },

  async getFileStream(artifactId: string): Promise<{ stream: Readable; contentType: string; fileName: string }> {
    const artifact = await prisma.artifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) {
      throw AppError.notFound('Artifact not found');
    }

    if (!artifact.filePath) {
      throw AppError.badRequest('Artifact has no file attached');
    }

    const { stream, contentType } = await getMinIOStream(artifact.filePath);

    return {
      stream,
      contentType,
      fileName: artifact.filePath.split('/').pop() || artifact.name,
    };
  },

  inferType(_mimeType: string): string {
    return 'file';
  },
};

