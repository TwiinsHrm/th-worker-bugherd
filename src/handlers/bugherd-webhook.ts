import type { Env, BugherdWebhookPayload, GithubIssuePayload } from "../types";
import { GITHUB_PRIORITY_LABELS } from "../types";
import { findProjectByBugherdId, findGithubUsername } from "../config";
import {
  createGithubIssue,
  updateGithubIssue,
  assignIssue,
  buildLabelsFromPriority,
  setTaskExternalId,
  sendDiscordNotification,
} from "../services";
import {
  buildGithubIssueBody,
  buildGithubIssueTitle,
  buildDiscordNotification,
} from "../templates";

export async function handleBugherdWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  const rawBody = await request.text();
  console.log(`[BugHerd Webhook] Received payload`);

  let rawPayload: { task?: BugherdWebhookPayload["task"]; event?: string };

  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    console.error(`[BugHerd Webhook] Invalid JSON`);
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const task = rawPayload.task;

  if (!task) {
    console.error(`[BugHerd Webhook] No task in payload`);
    return new Response("No task in payload", { status: 400 });
  }

  const hasExternalId = task.external_id !== null && task.external_id !== undefined;
  const eventType = rawPayload.event || (hasExternalId ? "task_update" : "task_create");

  console.log(`[BugHerd Webhook] Task ID: ${task.id}, Event: ${eventType}, Has external_id: ${hasExternalId}`);

  const isTaskCreate = eventType === "task_create";
  const isTaskUpdate = eventType === "task_update";

  if (!isTaskCreate && !isTaskUpdate) {
    console.log(`[BugHerd Webhook] Ignoring event: ${eventType}`);
    return new Response(`Event ${eventType} ignored`, { status: 200 });
  }

  const project = findProjectByBugherdId(task.project_id);
  console.log(`[BugHerd Webhook] Project mapping found: ${project !== null}`);

  if (!project) {
    console.log(`Project ${task.project_id} not mapped, ignoring`);
    return new Response("Project not mapped", { status: 200 });
  }

  if (isTaskUpdate) {
    return handleTaskUpdate(task, project, env);
  }

  return handleTaskCreate(task, project, env);
}

async function handleTaskCreate(
  task: BugherdWebhookPayload["task"],
  project: ReturnType<typeof findProjectByBugherdId>,
  env: Env
): Promise<Response> {
  if (!project) {
    return new Response("Project not found", { status: 400 });
  }

  const githubUsername = findGithubUsername(task.tag_names);
  const labels = buildLabelsFromPriority(task.priority_id, GITHUB_PRIORITY_LABELS);

  const issuePayload: GithubIssuePayload = {
    title: buildGithubIssueTitle(task),
    body: buildGithubIssueBody(task),
    labels,
  };

  try {
    const githubIssue = await createGithubIssue(
      env.GITHUB_TOKEN,
      project.githubOwner,
      project.githubRepo,
      issuePayload
    );

    console.log(`Created GitHub issue #${githubIssue.number}`);

    if (githubUsername) {
      await assignIssue(
        env.GITHUB_TOKEN,
        project.githubOwner,
        project.githubRepo,
        githubIssue.number,
        [githubUsername]
      );
      console.log(`Assigned issue to ${githubUsername}`);
    }

    await setTaskExternalId(
      env.BUGHERD_API_KEY,
      task.project_id,
      task.id,
      String(githubIssue.number)
    );
    console.log(`Set external_id on BugHerd task`);

    const discordWebhookUrl = getDiscordWebhookUrl(env, project.discordWebhookEnvKey);

    if (discordWebhookUrl) {
      const discordPayload = buildDiscordNotification(
        task,
        githubIssue,
        githubUsername
      );
      await sendDiscordNotification(discordWebhookUrl, discordPayload);
      console.log(`Sent Discord notification`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: "created",
        issueNumber: githubIssue.number,
        issueUrl: githubIssue.html_url,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error creating issue: ${errorMessage}`);
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}

async function handleTaskUpdate(
  task: BugherdWebhookPayload["task"],
  project: ReturnType<typeof findProjectByBugherdId>,
  env: Env
): Promise<Response> {
  if (!project) {
    return new Response("Project not found", { status: 400 });
  }

  if (!task.external_id) {
    console.log(`Task ${task.id} has no external_id, skipping update`);
    return new Response("Task has no linked GitHub issue", { status: 200 });
  }

  const issueNumber = parseInt(task.external_id, 10);

  if (isNaN(issueNumber)) {
    console.log(`Invalid external_id: ${task.external_id}`);
    return new Response("Invalid external_id", { status: 200 });
  }

  const githubUsername = findGithubUsername(task.tag_names);
  const labels = buildLabelsFromPriority(task.priority_id, GITHUB_PRIORITY_LABELS);

  try {
    const updatedIssue = await updateGithubIssue(
      env.GITHUB_TOKEN,
      project.githubOwner,
      project.githubRepo,
      issueNumber,
      {
        title: buildGithubIssueTitle(task),
        body: buildGithubIssueBody(task),
        labels,
      }
    );

    console.log(`Updated GitHub issue #${issueNumber}`);

    if (githubUsername) {
      await assignIssue(
        env.GITHUB_TOKEN,
        project.githubOwner,
        project.githubRepo,
        issueNumber,
        [githubUsername]
      );
      console.log(`Updated assignee to ${githubUsername}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: "updated",
        issueNumber: updatedIssue.number,
        issueUrl: updatedIssue.html_url,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error updating issue: ${errorMessage}`);
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}

function getDiscordWebhookUrl(env: Env, envKey: string): string | null {
  const envRecord = env as unknown as Record<string, string>;
  return envRecord[envKey] || null;
}


