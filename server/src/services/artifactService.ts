import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { uploadFile, getFileStream as getMinIOStream, deleteFile } from '../lib/minio';
import { Readable } from 'stream';

export const artifactService = {
  async list(filters?: { projectId?: string; type?: string; page?: number; pageSize?: number }) {
    const where: Record<string, unknown> = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.type) where.type = filters.type;

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
    return prisma.artifact.create({
      data: {
        name: data.name,
        type: data.type,
        status: data.status || 'draft',
        filePath: data.filePath,
        content: data.content,
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
    return prisma.artifact.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        status: data.status,
        filePath: data.filePath,
        content: data.content,
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
    const objectName = `${metadata.projectId}/${timestamp}-${safeFileName}`;

    const filePath = await uploadFile(file.buffer, objectName, file.mimetype);

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
      fileName: artifact.name,
    };
  },

  inferType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('zip')) return 'archive';
    if (mimeType.includes('html')) return 'prototype';
    return 'document';
  },
};

