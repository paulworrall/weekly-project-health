-- Brief 07: record report generations in the change history. Adds one value to the list of
-- audit actions; no existing rows are touched.
ALTER TYPE "AuditAction" ADD VALUE 'GENERATE';
