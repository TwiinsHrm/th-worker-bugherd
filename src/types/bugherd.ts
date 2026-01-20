export interface BugherdTask {
  id: number;
  local_task_id: number;
  project_id: number;
  description: string;
  priority_id: number | null;
  status_id: number | null;
  tag_names: string[];
  screenshot_url: string | null;
  url: string | null;
  external_id: string | null;
  admin_link: string;
  requester_email: string | null;
  created_at: string;
  updated_at: string;
  selector_info: BugherdSelectorInfo | null;
}

export interface BugherdSelectorInfo {
  browser: string | null;
  os: string | null;
  resolution: string | null;
}

export interface BugherdWebhookPayload {
  event: BugherdWebhookEvent;
  task: BugherdTask;
}

export type BugherdWebhookEvent =
  | "task_create"
  | "task_update"
  | "comment"
  | "task_destroy"
  | "project_create";

export interface BugherdUpdateTaskPayload {
  status?: string;
  status_id?: number;
  external_id?: string;
}

export const BUGHERD_PRIORITY_MAP: Record<number, string> = {
  0: "not set",
  1: "critical",
  2: "important",
  3: "normal",
  4: "minor",
};
