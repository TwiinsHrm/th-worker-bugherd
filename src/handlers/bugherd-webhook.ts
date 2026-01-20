import type { Env, BugherdWebhookPayload, GithubIssuePayload } from "../types";
import { GITHUB_PRIORITY_LABELS } from "../types";
import { findProjectByBugherdId, findGithubUsername } from "../config";
import {
  createGithubIssue,
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
  let payload: BugherdWebhookPayload;

  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  if (payload.event !== "task_create") {
    return new Response(`Event ${payload.event} ignored`, { status: 200 });
  }

  const task = payload.task;
  const project = findProjectByBugherdId(task.project_id);

  if (!project) {
    console.log(`Project ${task.project_id} not mapped, ignoring`);
    return new Response("Project not mapped", { status: 200 });
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
    console.error(`Error processing webhook: ${errorMessage}`);
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}

function getDiscordWebhookUrl(env: Env, envKey: string): string | null {
  const envRecord = env as unknown as Record<string, string>;
  return envRecord[envKey] || null;
}
