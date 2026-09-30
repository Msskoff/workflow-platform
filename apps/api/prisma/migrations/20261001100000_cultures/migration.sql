-- CreateTable
CREATE TABLE "Culture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "nomScientifique" TEXT,
    "cycleJours" INTEGER NOT NULL,
    "stades" JSONB NOT NULL,
    "aValider" BOOLEAN NOT NULL DEFAULT true,
    "noteValidation" TEXT NOT NULL DEFAULT '',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campagne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelleId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "cultureId" TEXT,
    "culture" TEXT,
    "dateDebut" TEXT NOT NULL,
    "dateFin" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Campagne_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Campagne_cultureId_fkey" FOREIGN KEY ("cultureId") REFERENCES "Culture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Campagne" ("creeLe", "culture", "dateDebut", "dateFin", "id", "modifieLe", "nom", "parcelleId") SELECT "creeLe", "culture", "dateDebut", "dateFin", "id", "modifieLe", "nom", "parcelleId" FROM "Campagne";
DROP TABLE "Campagne";
ALTER TABLE "new_Campagne" RENAME TO "Campagne";
CREATE INDEX "Campagne_parcelleId_idx" ON "Campagne"("parcelleId");
CREATE INDEX "Campagne_cultureId_idx" ON "Campagne"("cultureId");
CREATE TABLE "new_ModeleWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "predefini" BOOLEAN NOT NULL DEFAULT false,
    "cultureId" TEXT,
    "parametresDefaut" JSONB,
    "graphe" JSONB NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "ModeleWorkflow_cultureId_fkey" FOREIGN KEY ("cultureId") REFERENCES "Culture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ModeleWorkflow" ("code", "creeLe", "description", "graphe", "id", "modifieLe", "nom", "predefini") SELECT "code", "creeLe", "description", "graphe", "id", "modifieLe", "nom", "predefini" FROM "ModeleWorkflow";
DROP TABLE "ModeleWorkflow";
ALTER TABLE "new_ModeleWorkflow" RENAME TO "ModeleWorkflow";
CREATE UNIQUE INDEX "ModeleWorkflow_code_key" ON "ModeleWorkflow"("code");
CREATE UNIQUE INDEX "ModeleWorkflow_nom_key" ON "ModeleWorkflow"("nom");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Culture_code_key" ON "Culture"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Culture_nom_key" ON "Culture"("nom");

