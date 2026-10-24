ALTER TABLE "ContentDocument" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "Drawing" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "ContentDocument_shareToken_key" ON "ContentDocument"("shareToken");
CREATE UNIQUE INDEX "Drawing_shareToken_key" ON "Drawing"("shareToken");
