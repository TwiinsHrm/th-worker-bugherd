import type { BugherdTask, BugherdUpdateTaskPayload } from "../types";

const BUGHERD_API_BASE = "https://www.bugherd.com/api_v2";

function createAuthHeader(apiKey: string): string {
  const credentials = btoa(`${apiKey}:x`);
  return `Basic ${credentials}`;
}

export async function updateBugherdTask(
  apiKey: string,
  projectId: number,
  taskId: number,
  payload: BugherdUpdateTaskPayload
): Promise<void> {
  const url = `${BUGHERD_API_BASE}/projects/${projectId}/tasks/${taskId}.json`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: createAuthHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task: payload }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `BugHerd API error: ${response.status} - ${errorText}`
    );
  }
}

export async function findTaskByExternalId(
  apiKey: string,
  projectId: number,
  externalId: string
): Promise<BugherdTask | null> {
  const url = `${BUGHERD_API_BASE}/projects/${projectId}/tasks.json?external_id=${externalId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: createAuthHeader(apiKey),
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    throw new Error(
      `BugHerd API error: ${response.status} - ${errorText}`
    );
  }

  const data = (await response.json()) as { tasks: BugherdTask[] };

  if (data.tasks.length === 0) {
    return null;
  }

  return data.tasks[0];
}

export async function setTaskExternalId(
  apiKey: string,
  projectId: number,
  taskId: number,
  externalId: string
): Promise<void> {
  await updateBugherdTask(apiKey, projectId, taskId, {
    external_id: externalId,
  });
}

export async function moveTaskToColumn(
  apiKey: string,
  projectId: number,
  taskId: number,
  columnName: string
): Promise<void> {
  await updateBugherdTask(apiKey, projectId, taskId, {
    status: columnName,
  });
}
