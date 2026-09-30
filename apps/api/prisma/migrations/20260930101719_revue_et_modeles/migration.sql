-- AlterTable
ALTER TABLE "Decision" ADD COLUMN "motifRejet" TEXT;
ALTER TABLE "Decision" ADD COLUMN "rejeteeLe" DATETIME;

-- CreateTable
CREATE TABLE "ModeleWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "predefini" BOOLEAN NOT NULL DEFAULT false,
    "graphe" JSONB NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ModeleWorkflow_code_key" ON "ModeleWorkflow"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ModeleWorkflow_nom_key" ON "ModeleWorkflow"("nom");
