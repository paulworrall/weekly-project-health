/**
 * zod schemas shared by client forms and (from brief 05) Server Actions. Field-level messages,
 * never a generic "Invalid input".
 */
import { z } from "zod";
import {
  ISSUE_PRIORITIES,
  LIKELIHOODS,
  LOG_STATUSES,
  PROJECT_STATUSES,
  RISK_SEVERITIES,
} from "./domain";
import { RAG_VALUES } from "@/lib/rag";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a date." });
const optionalIsoDate = z.union([isoDate, z.literal("")]).optional();

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: "Enter your work email." })
    .pipe(z.email({ error: "Enter an email address like name@example.com." })),
  password: z.string().min(1, { error: "Enter your password." }),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const weeklyUpdateSchema = z.object({
  status: z.enum(PROJECT_STATUSES, { error: "Choose a status." }),
  rag: z.enum(RAG_VALUES, { error: "Choose a Delivery RAG." }),
  percentComplete: z
    .number({ error: "Choose % complete." })
    .int({ error: "Choose % complete from the list." })
    .min(0, { error: "% complete can't be below 0%." })
    .max(100, { error: "% complete can't be above 100%." })
    .multipleOf(10, { error: "Choose % complete in steps of 10%." }),
  updateText: z.string().trim().max(4000, { error: "Keep the update under 4,000 characters." }),
});
export type WeeklyUpdateInput = z.infer<typeof weeklyUpdateSchema>;

/** Submitting also needs some update text; a draft can be empty. */
export const weeklySubmitSchema = weeklyUpdateSchema.extend({
  updateText: z
    .string()
    .trim()
    .min(1, { error: "Write this week's update before submitting." })
    .max(4000, { error: "Keep the update under 4,000 characters." }),
});

const logBase = {
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter a title." })
    .max(200, { error: "Keep the title under 200 characters." }),
  owner: z
    .string()
    .trim()
    .min(1, { error: "Enter an owner." })
    .max(80, { error: "Keep the owner under 80 characters." }),
  status: z.enum(LOG_STATUSES, { error: "Choose a status." }),
  dueOn: optionalIsoDate,
  action: z.string().trim().max(1000, { error: "Keep this under 1,000 characters." }),
};

export const riskSchema = z.object({
  ...logBase,
  level: z.enum(RISK_SEVERITIES, { error: "Choose a severity." }),
});

export const issueSchema = z.object({
  ...logBase,
  level: z.enum(ISSUE_PRIORITIES, { error: "Choose a priority." }),
});
export type LogItemInput = z.infer<typeof riskSchema> | z.infer<typeof issueSchema>;

export const pipelineSchema = z.object({
  likelihood: z.enum(LIKELIHOODS, { error: "Choose a likelihood." }),
  title: z
    .string()
    .trim()
    .min(1, { error: "Describe the opportunity." })
    .max(300, { error: "Keep this under 300 characters." }),
  possibleStart: optionalIsoDate,
  mapOwner: z.string().trim().min(1, { error: "Enter the MAP owner." }).max(80),
  clientOwner: z.string().trim().max(80, { error: "Keep this under 80 characters." }),
  nextSteps: z.string().trim().max(1000, { error: "Keep this under 1,000 characters." }),
});
export type PipelineInput = z.infer<typeof pipelineSchema>;

export const uploadFormSchema = z.object({
  clientId: z.string().min(1, { error: "Choose a client." }),
  extractDate: isoDate,
  fileName: z
    .string()
    .min(1, { error: "Choose the spend file." })
    .regex(/\.xlsx$/i, { error: "Choose an Excel file (.xlsx)." }),
});

/** First-message-per-field errors from a failed parse. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
