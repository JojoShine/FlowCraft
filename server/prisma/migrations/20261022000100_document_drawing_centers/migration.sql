-- CreateTable
CREATE TABLE "ContentDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "searchText" TEXT NOT NULL DEFAULT '',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRevision" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "restoredFrom" INTEGER,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "restoredFrom" INTEGER,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previewAssetId" TEXT,

    CONSTRAINT "DrawingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDrawingReference" (
    "id" TEXT NOT NULL,
    "documentRevisionId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,

    CONSTRAINT "DocumentDrawingReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRevisionAsset" (
    "documentRevisionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "DocumentRevisionAsset_pkey" PRIMARY KEY ("documentRevisionId","assetId")
);

-- CreateTable
CREATE TABLE "DrawingRevisionAsset" (
    "drawingRevisionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "DrawingRevisionAsset_pkey" PRIMARY KEY ("drawingRevisionId","assetId")
);

-- CreateTable
CREATE TABLE "ContentSaveReceipt" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "requestDigest" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSaveReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "lastViewedAt" TIMESTAMP(3),
    "viewState" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ContentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentDocument_projectId_deletedAt_updatedAt_idx" ON "ContentDocument"("projectId", "deletedAt", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRevision_documentId_version_key" ON "DocumentRevision"("documentId", "version");

-- CreateIndex
CREATE INDEX "Drawing_projectId_deletedAt_updatedAt_idx" ON "Drawing"("projectId", "deletedAt", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingRevision_drawingId_version_key" ON "DrawingRevision"("drawingId", "version");

-- CreateIndex
CREATE INDEX "DocumentDrawingReference_drawingId_revision_idx" ON "DocumentDrawingReference"("drawingId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDrawingReference_documentRevisionId_blockId_key" ON "DocumentDrawingReference"("documentRevisionId", "blockId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentAsset_objectKey_key" ON "ContentAsset"("objectKey");

-- CreateIndex
CREATE INDEX "ContentAsset_projectId_state_idx" ON "ContentAsset"("projectId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSaveReceipt_kind_entityId_requestId_key" ON "ContentSaveReceipt"("kind", "entityId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPreference_userId_kind_entityId_key" ON "ContentPreference"("userId", "kind", "entityId");

-- AddForeignKey
ALTER TABLE "ContentDocument" ADD CONSTRAINT "ContentDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "Drawing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_previewAssetId_fkey" FOREIGN KEY ("previewAssetId") REFERENCES "ContentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDrawingReference" ADD CONSTRAINT "DocumentDrawingReference_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDrawingReference" ADD CONSTRAINT "DocumentDrawingReference_drawingId_revision_fkey" FOREIGN KEY ("drawingId", "revision") REFERENCES "DrawingRevision"("drawingId", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAsset" ADD CONSTRAINT "ContentAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevisionAsset" ADD CONSTRAINT "DocumentRevisionAsset_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevisionAsset" ADD CONSTRAINT "DocumentRevisionAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ContentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevisionAsset" ADD CONSTRAINT "DrawingRevisionAsset_drawingRevisionId_fkey" FOREIGN KEY ("drawingRevisionId") REFERENCES "DrawingRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevisionAsset" ADD CONSTRAINT "DrawingRevisionAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ContentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPreference" ADD CONSTRAINT "ContentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

