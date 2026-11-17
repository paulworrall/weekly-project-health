/**
 * Sample-data repository: the shared views (src/lib/views.ts) over the synthetic mock dataset.
 * Used by tests and as a fixture; the site reads from the database (src/server/repository.ts).
 */
import { createViews, type Dataset } from "@/lib/views";
import {
  ADMIN,
  ALL_WEEKS,
  AUDIT_EVENTS,
  CLIENTS,
  CURRENT_WEEK,
  FIRST_WEEK,
  LOG_ITEMS,
  LOG_SEQ,
  MOCK_NOW,
  MOCK_TODAY,
  PIPELINE,
  PROJECTS,
  PROJECT_WEEKS,
  SPEND,
  STAGED_CHANGES,
  STAGED_UPLOAD,
  UPLOADS,
  USERS,
  WORKSTREAMS,
} from "./data";

export const mockDataset: Dataset = {
  now: MOCK_NOW,
  today: MOCK_TODAY,
  currentWeek: CURRENT_WEEK,
  firstWeek: FIRST_WEEK,
  allWeeks: ALL_WEEKS,
  users: USERS,
  admin: ADMIN,
  clients: CLIENTS,
  workstreams: WORKSTREAMS,
  projects: PROJECTS,
  projectWeeks: PROJECT_WEEKS,
  spend: SPEND,
  logItems: LOG_ITEMS,
  pipeline: PIPELINE,
  uploads: UPLOADS,
  staged: [{ upload: STAGED_UPLOAD, changes: STAGED_CHANGES }],
  auditEvents: AUDIT_EVENTS,
  logSeq: LOG_SEQ,
};

const views = createViews(mockDataset);

export const DEFAULT_CLIENT_ID = views.defaultClientId;
export const {
  now,
  viewerForRole,
  resolveWeek,
  weekOptions,
  getClient,
  getClients,
  getClientOverview,
  getWorkstreamOverview,
  getProjectPage,
  getLogData,
  getAdminHome,
  getClientList,
  getUploadsView,
  getUsers,
  getAuditEvents,
  getClientsTable,
  previousWeekKey,
} = views;
export { LOG_SEQ };
export type { LogData } from "@/types/views";
