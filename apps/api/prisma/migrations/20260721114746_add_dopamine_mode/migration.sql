-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "dopamineGames" TEXT[],
ADD COLUMN     "dopamineMode" BOOLEAN NOT NULL DEFAULT false;
