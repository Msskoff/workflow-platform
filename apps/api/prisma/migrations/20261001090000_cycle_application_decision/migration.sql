-- AlterTable
ALTER TABLE "Decision" ADD COLUMN "applicationDeclareePar" TEXT;
ALTER TABLE "Decision" ADD COLUMN "appliqueeLe" DATETIME;
ALTER TABLE "Decision" ADD COLUMN "motifNonApplication" TEXT;
ALTER TABLE "Decision" ADD COLUMN "nonAppliqueeLe" DATETIME;
ALTER TABLE "Decision" ADD COLUMN "prevuCoutEstime" REAL;
ALTER TABLE "Decision" ADD COLUMN "prevuDate" TEXT;
ALTER TABLE "Decision" ADD COLUMN "prevuDose" REAL;
ALTER TABLE "Decision" ADD COLUMN "prevuProduit" TEXT;
ALTER TABLE "Decision" ADD COLUMN "prevuUniteDose" TEXT;
ALTER TABLE "Decision" ADD COLUMN "reelCout" REAL;
ALTER TABLE "Decision" ADD COLUMN "reelDate" TEXT;
ALTER TABLE "Decision" ADD COLUMN "reelDose" REAL;
ALTER TABLE "Decision" ADD COLUMN "reelPhoto" BLOB;
ALTER TABLE "Decision" ADD COLUMN "reelPhotoType" TEXT;
ALTER TABLE "Decision" ADD COLUMN "reelProduit" TEXT;
ALTER TABLE "Decision" ADD COLUMN "reelUniteDose" TEXT;

