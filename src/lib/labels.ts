/** UI words for domain values (UK English). Levels and statuses are always shown as words. */
import type {
  IssuePriority,
  Likelihood,
  LogKind,
  LogLevel,
  LogStatus,
  ProjectStatus,
  RiskSeverity,
} from "@/types/domain";
import { ISSUE_PRIORITIES, RISK_SEVERITIES } from "@/types/domain";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETE: "Complete",
};

export const LOG_STATUS_LABEL: Record<LogStatus, string> = {
  OPEN: "Open",
  ON_PAUSE: "On pause",
  CLOSED: "Closed",
};

export const LEVEL_LABEL: Record<LogLevel, string> = {
  BLOCKER: "Blocker",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const LIKELIHOOD_LABEL: Record<Likelihood, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** Levels in display order, most serious first. */
export function levelsFor(kind: LogKind): readonly (RiskSeverity | IssuePriority)[] {
  return kind === "RISK" ? RISK_SEVERITIES : ISSUE_PRIORITIES;
}

/** "Severity" for risks, "Priority" for issues. */
export function levelHeading(kind: LogKind): "Severity" | "Priority" {
  return kind === "RISK" ? "Severity" : "Priority";
}

/** "Mitigation" for risks, "Next step" for issues. */
export function actionHeading(kind: LogKind): "Mitigation" | "Next step" {
  return kind === "RISK" ? "Mitigation" : "Next step";
}

/** Rank of a level within its kind (0 = most serious), for sorting. */
export function levelRank(kind: LogKind, level: LogLevel): number {
  const i = (levelsFor(kind) as readonly LogLevel[]).indexOf(level);
  return i < 0 ? 99 : i;
}

export function isActive(status: LogStatus): boolean {
  return status !== "CLOSED";
}
