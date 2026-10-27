-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "UsageRecord" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "estimatedCost" DOUBLE PRECISION,
ADD COLUMN     "latencyMs" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "ProviderConfiguration" (
    "id" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultModel" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "retryAttempts" INTEGER NOT NULL DEFAULT 0,
    "requestLimit" INTEGER NOT NULL DEFAULT 30,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "connectionStatus" TEXT NOT NULL DEFAULT 'not_configured',
    "checkedAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "safeMessage" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "providerId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "masked" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("providerId")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capabilities" TEXT[],
    "contextLimit" INTEGER,
    "inputType" TEXT NOT NULL DEFAULT 'text',
    "outputType" TEXT NOT NULL DEFAULT 'text',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "inputCostPerMillion" DOUBLE PRECISION,
    "outputCostPerMillion" DOUBLE PRECISION,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureConfiguration" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "primaryModelId" TEXT,
    "secondaryModelId" TEXT,
    "fallbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fallbackConsent" BOOLEAN NOT NULL DEFAULT false,
    "timeoutMs" INTEGER NOT NULL DEFAULT 60000,
    "retryAttempts" INTEGER NOT NULL DEFAULT 0,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 200,
    "queueEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "UserQuota" (
    "userId" TEXT NOT NULL,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 200,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AdminMfa" (
    "userId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastCounter" BIGINT NOT NULL DEFAULT -1,
    "backupHashes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMfa_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AdminMfaGrant" (
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMfaGrant_pkey" PRIMARY KEY ("sessionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_providerId_identifier_key" ON "AIModel"("providerId", "identifier");

-- CreateIndex
CREATE INDEX "AdminMfaGrant_expiresAt_idx" ON "AdminMfaGrant"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIModel" ADD CONSTRAINT "AIModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;


UPDATE "UsageRecord" SET "status" = 'unknown';
