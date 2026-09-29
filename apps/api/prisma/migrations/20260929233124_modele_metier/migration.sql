-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Parcelle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "geometrie" JSONB NOT NULL,
    "surfaceHa" REAL NOT NULL,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Parcelle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campagne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelleId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "culture" TEXT,
    "dateDebut" TEXT NOT NULL,
    "dateFin" TEXT,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Campagne_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DonneeBrute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campagneId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "contenu" JSONB NOT NULL,
    "empreinte" TEXT NOT NULL,
    "importeeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DonneeBrute_campagneId_fkey" FOREIGN KEY ("campagneId") REFERENCES "Campagne" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campagneId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "empreinteSnapshot" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "erreur" TEXT,
    "demarreeLe" DATETIME,
    "termineeLe" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "ExecutionWorkflow_campagneId_fkey" FOREIGN KEY ("campagneId") REFERENCES "Campagne" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "noeudIds" JSONB NOT NULL,
    "explication" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "valideeLe" DATETIME,
    "envoyeeLe" DATETIME,
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" DATETIME NOT NULL,
    CONSTRAINT "Decision_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionWorkflow" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Parcelle_clientId_idx" ON "Parcelle"("clientId");

-- CreateIndex
CREATE INDEX "Campagne_parcelleId_idx" ON "Campagne"("parcelleId");

-- CreateIndex
CREATE INDEX "DonneeBrute_campagneId_type_idx" ON "DonneeBrute"("campagneId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionWorkflow_campagneId_workflowId_version_key" ON "ExecutionWorkflow"("campagneId", "workflowId", "version");

-- CreateIndex
CREATE INDEX "Decision_executionId_statut_idx" ON "Decision"("executionId", "statut");

-- Ajout manuel : immuabilité garantie par la base, en plus de l'API.
-- Ces triggers doivent être recréés si une migration future reconstruit ces tables.

-- Les données brutes importées ne sont jamais modifiées ni supprimées.
CREATE TRIGGER "DonneeBrute_interdire_modification"
BEFORE UPDATE ON "DonneeBrute"
BEGIN
    SELECT RAISE(ABORT, 'DonneeBrute est immuable : modification interdite');
END;

CREATE TRIGGER "DonneeBrute_interdire_suppression"
BEFORE DELETE ON "DonneeBrute"
BEGIN
    SELECT RAISE(ABORT, 'DonneeBrute est immuable : suppression interdite');
END;

-- Le snapshot d'une exécution et son identité (campagne, workflow, version) sont figés.
CREATE TRIGGER "ExecutionWorkflow_figer_snapshot"
BEFORE UPDATE OF "snapshot", "empreinteSnapshot", "version", "workflowId", "campagneId" ON "ExecutionWorkflow"
BEGIN
    SELECT RAISE(ABORT, 'ExecutionWorkflow : snapshot et version sont figés');
END;
