-- Brief 05b: pipeline value and time in pipeline.
-- Generated with `prisma migrate diff`, then hand-edited: Prisma adds "addedOn" as NOT NULL
-- straight away, which fails on existing rows, so it is added in three steps.

-- 1. Add both columns. "estimatedValue" stays nullable: opportunities saved before brief 05b
--    show "Not set" until someone edits them.
ALTER TABLE "PipelineOpportunity" ADD COLUMN "addedOn" DATE,
ADD COLUMN "estimatedValue" INTEGER;

-- 2. Existing opportunities were added to the pipeline when they were created. "createdAt" is
--    stored in UTC; take its Europe/London calendar date.
UPDATE "PipelineOpportunity"
SET "addedOn" = (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/London')::date
WHERE "addedOn" IS NULL;

-- 3. Every opportunity now has a date: make it required.
ALTER TABLE "PipelineOpportunity" ALTER COLUMN "addedOn" SET NOT NULL;
