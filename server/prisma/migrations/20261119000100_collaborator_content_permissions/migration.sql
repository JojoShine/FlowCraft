ALTER TABLE "User"
    ADD COLUMN "canEditDocuments" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "canEditDrawings" BOOLEAN NOT NULL DEFAULT false;
