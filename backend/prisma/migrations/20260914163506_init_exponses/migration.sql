-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('VIVIENDA', 'COMIDA', 'TRANSPORTE', 'SERVICIOS', 'OTROS');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTROS',
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");

-- CreateIndex
CREATE INDEX "expenses_userId_date_idx" ON "expenses"("userId", "date");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
