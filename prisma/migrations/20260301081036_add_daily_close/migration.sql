-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DAILY_CLOSED';

-- CreateTable
CREATE TABLE "DailyClose" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "expectedCash" DECIMAL(10,2) NOT NULL,
    "actualCash" DECIMAL(10,2) NOT NULL,
    "variance" DECIMAL(10,2) NOT NULL,
    "cardTotal" DECIMAL(10,2) NOT NULL,
    "totalRevenue" DECIMAL(10,2) NOT NULL,
    "totalTax" DECIMAL(10,2) NOT NULL,
    "totalTips" DECIMAL(10,2) NOT NULL,
    "totalDiscount" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "closedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyClose_date_key" ON "DailyClose"("date");

-- CreateIndex
CREATE INDEX "DailyClose_date_idx" ON "DailyClose"("date");

-- AddForeignKey
ALTER TABLE "DailyClose" ADD CONSTRAINT "DailyClose_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
