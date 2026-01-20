import type {
  GithubIssuePayload,
  GithubIssueResponse,
  GITHUB_PRIORITY_LABELS,
} from "../types";

const GITHUB_API_BASE = "https://api.github.com";

export async function createGithubIssue(
  token: string,
  owner: string,
  repo: string,
  payload: GithubIssuePayload
): Promise<GithubIssueResponse> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub API error: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

export async function assignIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  assignees: string[]
): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/assignees`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ assignees }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub API error assigning issue: ${response.status} - ${errorText}`
    );
  }
}

export async function updateGithubIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  payload: Partial<GithubIssuePayload>
): Promise<GithubIssueResponse> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub API error updating issue: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

export function buildLabelsFromPriority(
  priorityId: number | null,
  priorityLabels: typeof GITHUB_PRIORITY_LABELS
): string[] {
  const labels = ["bug", "bugherd"];

  if (priorityId !== null && priorityLabels[priorityId]) {
    labels.push(priorityLabels[priorityId]);
  }

  return labels;
}

export async function verifyWebhookSignature(
  secret: string,
  signature: string,
  payload: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const expectedSignature =
    "sha256=" +
    Array.from(new Uint8Array(signatureBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  return signature === expectedSignature;
}
