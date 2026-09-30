-- CreateTable
CREATE TABLE "ExecutionNoeud" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "noeudId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "sorties" JSONB,
    "erreur" TEXT,
    "demarreLe" DATETIME,
    "termineLe" DATETIME,
    CONSTRAINT "ExecutionNoeud_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionWorkflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionNoeud_executionId_noeudId_key" ON "ExecutionNoeud"("executionId", "noeudId");
