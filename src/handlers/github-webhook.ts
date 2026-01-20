import type { Env, GithubWebhookPayload } from "../types";
import { findProjectByGithubRepo } from "../config";
import {
  verifyWebhookSignature,
  findTaskByExternalId,
  moveTaskToColumn,
} from "../services";

export async function handleGithubWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  const signature = request.headers.get("X-Hub-Signature-256");
  const event = request.headers.get("X-GitHub-Event");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  if (event !== "issues") {
    return new Response(`Event ${event} ignored`, { status: 200 });
  }

  const rawBody = await request.text();

  const isValidSignature = await verifyWebhookSignature(
    env.GITHUB_WEBHOOK_SECRET,
    signature,
    rawBody
  );

  if (!isValidSignature) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: GithubWebhookPayload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const isClosedAction = payload.action === "closed";
  const isReopenedAction = payload.action === "reopened";

  if (!isClosedAction && !isReopenedAction) {
    return new Response(`Action ${payload.action} ignored`, { status: 200 });
  }

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;

  const project = findProjectByGithubRepo(owner, repo);

  if (!project) {
    console.log(`Repository ${owner}/${repo} not mapped, ignoring`);
    return new Response("Repository not mapped", { status: 200 });
  }

  try {
    const task = await findTaskByExternalId(
      env.BUGHERD_API_KEY,
      project.bugherdProjectId,
      String(issueNumber)
    );

    if (!task) {
      console.log(`No BugHerd task found for issue #${issueNumber}`);
      return new Response("Task not found in BugHerd", { status: 200 });
    }

    let targetColumn: string;

    if (isClosedAction) {
      targetColumn = project.closedStatusColumn;
    } else {
      targetColumn = "doing";
    }

    await moveTaskToColumn(
      env.BUGHERD_API_KEY,
      project.bugherdProjectId,
      task.id,
      targetColumn
    );

    console.log(
      `Moved BugHerd task #${task.local_task_id} to "${targetColumn}"`
    );

    return new Response(
      JSON.stringify({
        success: true,
        taskId: task.id,
        newStatus: targetColumn,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error processing GitHub webhook: ${errorMessage}`);
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}
