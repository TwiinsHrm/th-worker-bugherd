export interface GithubIssuePayload {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export interface GithubUser {
  login: string;
  id: number;
}

export interface GithubPullRequest {
  url: string;
  html_url: string;
  number: number;
}

export interface GithubIssueResponse {
  id: number;
  number: number;
  html_url: string;
  state: string;
  title: string;
  assignees?: GithubUser[];
  pull_request?: GithubPullRequest;
}

export interface GithubWebhookPayload {
  action: GithubIssueAction;
  issue: GithubIssueResponse;
  repository: GithubRepository;
}

export type GithubIssueAction =
  | "opened"
  | "closed"
  | "reopened"
  | "assigned"
  | "labeled"
  | "edited"
  | "deleted";

export interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

export const GITHUB_PRIORITY_LABELS: Record<number, string> = {
  1: "priority: critical",
  2: "priority: high",
  3: "priority: medium",
  4: "priority: low",
};
