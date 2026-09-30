-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "modeleId" TEXT,
    "modeleNom" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "graphe" JSONB NOT NULL,
    "valeurs" JSONB NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Lot_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "ModeleWorkflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TacheLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "campagneId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "maxTentatives" INTEGER NOT NULL DEFAULT 3,
    "prochaineTentativeLe" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "verrouilleeLe" DATETIME,
    "termineeLe" DATETIME,
    "erreur" TEXT,
    "executionId" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "TacheLot_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TacheLot_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TacheLot_campagneId_fkey" FOREIGN KEY ("campagneId") REFERENCES "Campagne" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TacheLot_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionWorkflow" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TacheLot_statut_prochaineTentativeLe_idx" ON "TacheLot"("statut", "prochaineTentativeLe");

-- CreateIndex
CREATE UNIQUE INDEX "TacheLot_lotId_parcelleId_key" ON "TacheLot"("lotId", "parcelleId");

