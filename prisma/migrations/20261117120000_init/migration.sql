-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'UPDATER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IN_PROGRESS', 'ON_HOLD', 'COMPLETE');

-- CreateEnum
CREATE TYPE "Rag" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "UpdateState" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('BLOCKER', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('OPEN', 'ON_PAUSE', 'CLOSED');

-- CreateEnum
CREATE TYPE "Likelihood" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "SpendStatus" AS ENUM ('VALUE', 'NO_BUDGET', 'NO_TIMESHEET');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('CHECKING', 'REJECTED', 'READY_TO_REVIEW', 'CANCELLED', 'LIVE', 'REPLACED');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('NEW', 'CHANGED', 'MOVED', 'MISSING');

-- CreateEnum
CREATE TYPE "ChangeField" AS ENUM ('name', 'percentSpent');

-- CreateEnum
CREATE TYPE "MissingDecision" AS ENUM ('KEEP', 'MARK');

-- CreateEnum
CREATE TYPE "PeriodState" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "failedSignInCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastSignInAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riskSeq" INTEGER NOT NULL DEFAULT 0,
    "issueSeq" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workstream" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "accountDirector" TEXT,
    "firstSeen" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workstream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "includeInReport" BOOLEAN NOT NULL DEFAULT false,
    "missingFromFileSince" DATE,
    "markedNoLongerInFileAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendUpload" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "extractDate" DATE NOT NULL,
    "fileName" TEXT NOT NULL,
    "file" BYTEA,
    "status" "UploadStatus" NOT NULL,
    "note" TEXT,
    "rowCount" INTEGER,
    "newCount" INTEGER,
    "changedCount" INTEGER,
    "missingCount" INTEGER,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpendUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendUploadRow" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "workstreamName" TEXT NOT NULL,
    "percentSpent" DECIMAL(12,6),
    "spendStatus" "SpendStatus",
    "error" TEXT,

    CONSTRAINT "SpendUploadRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendUploadChange" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "type" "ChangeType" NOT NULL,
    "field" "ChangeField",
    "jobNumber" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "workstreamName" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "decision" "MissingDecision",

    CONSTRAINT "SpendUploadChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSpend" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "percentSpent" DECIMAL(12,6),
    "spendStatus" "SpendStatus" NOT NULL,

    CONSTRAINT "ProjectSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingPeriod" (
    "id" TEXT NOT NULL,
    "isoYear" INTEGER NOT NULL,
    "isoWeek" INTEGER NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "state" "PeriodState" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectWeek" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "rag" "Rag" NOT NULL,
    "percentComplete" INTEGER NOT NULL,
    "updateText" TEXT NOT NULL DEFAULT '',
    "state" "UpdateState" NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "notUpdated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "RiskSeverity" NOT NULL,
    "owner" TEXT NOT NULL,
    "status" "LogStatus" NOT NULL DEFAULT 'OPEN',
    "raisedOn" DATE NOT NULL,
    "dueOn" DATE,
    "action" TEXT NOT NULL DEFAULT '',
    "closedOn" DATE,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "IssuePriority" NOT NULL,
    "owner" TEXT NOT NULL,
    "status" "LogStatus" NOT NULL DEFAULT 'OPEN',
    "raisedOn" DATE NOT NULL,
    "dueOn" DATE,
    "action" TEXT NOT NULL DEFAULT '',
    "closedOn" DATE,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineOpportunity" (
    "id" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "likelihood" "Likelihood" NOT NULL,
    "title" TEXT NOT NULL,
    "possibleStart" DATE,
    "mapOwner" TEXT NOT NULL,
    "clientOwner" TEXT NOT NULL DEFAULT '',
    "nextSteps" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectWeekSnapshot" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectWeekSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineWeekSnapshot" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "workstreamId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineWeekSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogWeekSnapshot" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogWeekSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Workstream_clientId_name_key" ON "Workstream"("clientId", "name");

-- CreateIndex
CREATE INDEX "Project_workstreamId_idx" ON "Project"("workstreamId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_clientId_jobNumber_key" ON "Project"("clientId", "jobNumber");

-- CreateIndex
CREATE INDEX "SpendUpload_clientId_uploadedAt_idx" ON "SpendUpload"("clientId", "uploadedAt");

-- CreateIndex
CREATE INDEX "SpendUploadRow_uploadId_idx" ON "SpendUploadRow"("uploadId");

-- CreateIndex
CREATE INDEX "SpendUploadChange_uploadId_idx" ON "SpendUploadChange"("uploadId");

-- CreateIndex
CREATE INDEX "ProjectSpend_uploadId_idx" ON "ProjectSpend"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSpend_projectId_uploadId_key" ON "ProjectSpend"("projectId", "uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingPeriod_isoYear_isoWeek_key" ON "ReportingPeriod"("isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX "ProjectWeek_periodId_idx" ON "ProjectWeek"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWeek_projectId_periodId_key" ON "ProjectWeek"("projectId", "periodId");

-- CreateIndex
CREATE INDEX "RiskItem_projectId_idx" ON "RiskItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskItem_clientId_ref_key" ON "RiskItem"("clientId", "ref");

-- CreateIndex
CREATE INDEX "IssueItem_projectId_idx" ON "IssueItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueItem_clientId_ref_key" ON "IssueItem"("clientId", "ref");

-- CreateIndex
CREATE INDEX "PipelineOpportunity_workstreamId_idx" ON "PipelineOpportunity"("workstreamId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWeekSnapshot_periodId_projectId_key" ON "ProjectWeekSnapshot"("periodId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineWeekSnapshot_periodId_workstreamId_key" ON "PipelineWeekSnapshot"("periodId", "workstreamId");

-- CreateIndex
CREATE UNIQUE INDEX "LogWeekSnapshot_periodId_clientId_key" ON "LogWeekSnapshot"("periodId", "clientId");

-- CreateIndex
CREATE INDEX "AuditEvent_entity_entityId_idx" ON "AuditEvent"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");

-- AddForeignKey
ALTER TABLE "Workstream" ADD CONSTRAINT "Workstream_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "Workstream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendUpload" ADD CONSTRAINT "SpendUpload_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendUpload" ADD CONSTRAINT "SpendUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendUploadRow" ADD CONSTRAINT "SpendUploadRow_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SpendUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendUploadChange" ADD CONSTRAINT "SpendUploadChange_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SpendUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSpend" ADD CONSTRAINT "ProjectSpend_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSpend" ADD CONSTRAINT "ProjectSpend_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "SpendUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWeek" ADD CONSTRAINT "ProjectWeek_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWeek" ADD CONSTRAINT "ProjectWeek_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWeek" ADD CONSTRAINT "ProjectWeek_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueItem" ADD CONSTRAINT "IssueItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueItem" ADD CONSTRAINT "IssueItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineOpportunity" ADD CONSTRAINT "PipelineOpportunity_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "Workstream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWeekSnapshot" ADD CONSTRAINT "ProjectWeekSnapshot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWeekSnapshot" ADD CONSTRAINT "ProjectWeekSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineWeekSnapshot" ADD CONSTRAINT "PipelineWeekSnapshot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineWeekSnapshot" ADD CONSTRAINT "PipelineWeekSnapshot_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "Workstream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogWeekSnapshot" ADD CONSTRAINT "LogWeekSnapshot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogWeekSnapshot" ADD CONSTRAINT "LogWeekSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
