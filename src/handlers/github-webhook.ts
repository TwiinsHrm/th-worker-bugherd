import type { Env, GithubWebhookPayload } from "../types";
import { findProjectByGithubRepo, getDiscordIdByGithub } from "../config";
import {
  verifyWebhookSignature,
  findTaskByExternalId,
  moveTaskToColumn,
  sendDiscordNotification,
  getLinkedPullRequest,
  addCommentToTask,
} from "../services";
import { buildIssueClosedNotification } from "../templates";

interface PullRequestPayload {
  action: string;
  number: number;
  pull_request: {
    number: number;
    html_url: string;
    title: string;
    body: string | null;
    user: {
      login: string;
    };
  };
  repository: {
    owner: { login: string };
    name: string;
  };
}

export async function handleGithubWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  const signature = request.headers.get("X-Hub-Signature-256");
  const event = request.headers.get("X-GitHub-Event");

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
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

  if (event === "pull_request") {
    return handlePullRequestEvent(rawBody, env);
  }

  if (event !== "issues") {
    return new Response(`Event ${event} ignored`, { status: 200 });
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

  console.log(`[GitHub Webhook] Processing issue #${issueNumber}, action: ${payload.action}`);

  try {
    const task = await findTaskByExternalId(
      env.BUGHERD_API_KEY,
      project.bugherdProjectId,
      String(issueNumber)
    );

    console.log(`[GitHub Webhook] BugHerd task found: ${task ? `#${task.local_task_id}` : "none"}`);

    if (task) {
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

      console.log(`Moved BugHerd task #${task.local_task_id} to "${targetColumn}"`);
    }

    if (isClosedAction) {
      const discordWebhookUrl = getDiscordWebhookUrl(env, project.discordWebhookEnvKey);
      console.log(`[GitHub Webhook] Discord webhook URL found: ${discordWebhookUrl ? "yes" : "no"}`);

      if (discordWebhookUrl) {
        const closedByUsername = payload.issue.assignees?.[0]?.login || null;
        const closedByDiscordId = closedByUsername
          ? getDiscordIdByGithub(closedByUsername)
          : null;

        console.log(`[GitHub Webhook] Closed by: ${closedByUsername || "unknown"}, Discord ID: ${closedByDiscordId || "none"}`);

        const pullRequest = await getLinkedPullRequest(
          env.GITHUB_TOKEN,
          owner,
          repo,
          issueNumber
        );

        console.log(`[GitHub Webhook] Found linked PR: ${pullRequest ? `#${pullRequest.number}` : "none"}`);

        const bugherdAdminLink = task?.admin_link || null;

        const discordPayload = buildIssueClosedNotification({
          issue: payload.issue,
          closedByDiscordId,
          pullRequest,
          bugherdAdminLink,
        });

        await sendDiscordNotification(discordWebhookUrl, discordPayload);
        console.log(`[GitHub Webhook] Sent Discord notification for closed issue`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        taskId: task?.id || null,
        action: payload.action,
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

function getDiscordWebhookUrl(env: Env, envKey: string): string | null {
  const envRecord = env as unknown as Record<string, string>;
  return envRecord[envKey] || null;
}

async function handlePullRequestEvent(
  rawBody: string,
  env: Env
): Promise<Response> {
  let payload: PullRequestPayload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  if (payload.action !== "opened") {
    return new Response(`PR action ${payload.action} ignored`, { status: 200 });
  }

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prBody = payload.pull_request.body || "";
  const prNumber = payload.pull_request.number;
  const prUrl = payload.pull_request.html_url;
  const prTitle = payload.pull_request.title;

  const project = findProjectByGithubRepo(owner, repo);

  if (!project) {
    console.log(`Repository ${owner}/${repo} not mapped, ignoring PR`);
    return new Response("Repository not mapped", { status: 200 });
  }

  const issueMatches = prBody.match(/#(\d+)/g) || [];
  const titleMatches = prTitle.match(/#(\d+)/g) || [];
  const allMatches = [...new Set([...issueMatches, ...titleMatches])];

  if (allMatches.length === 0) {
    console.log(`[GitHub Webhook] PR #${prNumber} has no linked issues`);
    return new Response("No linked issues found", { status: 200 });
  }

  console.log(`[GitHub Webhook] PR #${prNumber} references issues: ${allMatches.join(", ")}`);

  const results: Array<{ issueNumber: number; success: boolean }> = [];

  for (const match of allMatches) {
    const issueNumber = parseInt(match.replace("#", ""), 10);

    if (isNaN(issueNumber)) {
      continue;
    }

    try {
      const task = await findTaskByExternalId(
        env.BUGHERD_API_KEY,
        project.bugherdProjectId,
        String(issueNumber)
      );

      if (task) {
        const prComment = `🔀 **Pull Request Creado**\n\n` +
          `Se ha creado el PR #${prNumber} que referencia este bug.\n\n` +
          `**${prTitle}**\n\n` +
          `🔗 ${prUrl}`;

        await addCommentToTask(
          env.BUGHERD_API_KEY,
          project.bugherdProjectId,
          task.id,
          prComment
        );

        console.log(`[GitHub Webhook] Added PR comment to BugHerd task #${task.local_task_id}`);
        results.push({ issueNumber, success: true });
      } else {
        console.log(`[GitHub Webhook] No BugHerd task found for issue #${issueNumber}`);
        results.push({ issueNumber, success: false });
      }
    } catch (error) {
      console.error(`[GitHub Webhook] Error adding PR comment for issue #${issueNumber}: ${error}`);
      results.push({ issueNumber, success: false });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      prNumber,
      linkedIssues: results,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
