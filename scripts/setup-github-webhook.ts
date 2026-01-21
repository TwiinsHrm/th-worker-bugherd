const GITHUB_API_BASE = "https://api.github.com";

interface GithubWebhook {
  id: number;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url: string;
    content_type: string;
  };
}

interface ProjectConfig {
  owner: string;
  repo: string;
}

const PROJECTS: ProjectConfig[] = [
  { owner: "TwiinsHrm", repo: "th-app" },
];

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const workerUrl = process.env.WORKER_URL;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!token) {
    console.error("Error: GITHUB_TOKEN environment variable is required");
    process.exit(1);
  }

  if (!workerUrl) {
    console.error("Error: WORKER_URL environment variable is required");
    console.error("Example: https://th-worker-bugherd.your-subdomain.workers.dev");
    process.exit(1);
  }

  if (!webhookSecret) {
    console.error("Error: GITHUB_WEBHOOK_SECRET environment variable is required");
    process.exit(1);
  }

  const targetUrl = `${workerUrl}/webhook/github`;

  for (const project of PROJECTS) {
    console.log(`\nProcessing ${project.owner}/${project.repo}...`);

    const listUrl = `${GITHUB_API_BASE}/repos/${project.owner}/${project.repo}/hooks`;

    const listResponse = await fetch(listUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error(`Error listing webhooks: ${listResponse.status} - ${errorText}`);
      continue;
    }

    const existingWebhooks = (await listResponse.json()) as GithubWebhook[];

    const existingWebhook = existingWebhooks.find(
      (webhook) => webhook.config.url === targetUrl
    );

    if (existingWebhook) {
      console.log(`Webhook already exists with ID: ${existingWebhook.id}`);
      console.log(`URL: ${existingWebhook.config.url}`);
      console.log(`Events: ${existingWebhook.events.join(", ")}`);
      continue;
    }

    console.log("Creating new webhook...");

    const createResponse = await fetch(listUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["issues", "pull_request"],
        config: {
          url: targetUrl,
          content_type: "json",
          secret: webhookSecret,
        },
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`Error creating webhook: ${createResponse.status} - ${errorText}`);
      continue;
    }

    const createdWebhook = (await createResponse.json()) as GithubWebhook;

    console.log("Webhook created successfully!");
    console.log(`ID: ${createdWebhook.id}`);
    console.log(`URL: ${createdWebhook.config.url}`);
    console.log(`Events: ${createdWebhook.events.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
