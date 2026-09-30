
-- AlterTable
ALTER TABLE "Client" ADD COLUMN "jetonAccesCreeLe" DATETIME;
ALTER TABLE "Client" ADD COLUMN "jetonAccesHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_jetonAccesHash_key" ON "Client"("jetonAccesHash");

