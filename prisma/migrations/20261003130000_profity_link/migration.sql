-- CreateTable
CREATE TABLE "ProfityLink" (
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "ProfityLink_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "ProfityLink" ADD CONSTRAINT "ProfityLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
