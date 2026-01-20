const BUGHERD_API_BASE = "https://www.bugherd.com/api_v2";

interface BugherdWebhook {
  id: number;
  project_id: number | null;
  target_url: string;
  event: string;
}

interface BugherdWebhooksResponse {
  webhooks: BugherdWebhook[];
}

async function main(): Promise<void> {
  const apiKey = process.env.BUGHERD_API_KEY;
  const workerUrl = process.env.WORKER_URL;

  if (!apiKey) {
    console.error("Error: BUGHERD_API_KEY environment variable is required");
    process.exit(1);
  }

  if (!workerUrl) {
    console.error("Error: WORKER_URL environment variable is required");
    console.error("Example: https://th-worker-bugherd.your-subdomain.workers.dev");
    process.exit(1);
  }

  const targetUrl = `${workerUrl}/webhook/bugherd`;
  const authHeader = `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`;

  console.log("Checking existing webhooks...");

  const listResponse = await fetch(`${BUGHERD_API_BASE}/webhooks.json`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
    },
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    console.error(`Error listing webhooks: ${listResponse.status} - ${errorText}`);
    process.exit(1);
  }

  const existingWebhooks = (await listResponse.json()) as BugherdWebhooksResponse;

  const existingWebhook = existingWebhooks.webhooks.find(
    (webhook) => webhook.target_url === targetUrl && webhook.event === "task_create"
  );

  if (existingWebhook) {
    console.log(`Webhook already exists with ID: ${existingWebhook.id}`);
    console.log(`Target URL: ${existingWebhook.target_url}`);
    console.log(`Event: ${existingWebhook.event}`);
    return;
  }

  console.log("Creating new webhook...");

  const createResponse = await fetch(`${BUGHERD_API_BASE}/webhooks.json`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target_url: targetUrl,
      event: "task_create",
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error(`Error creating webhook: ${createResponse.status} - ${errorText}`);
    process.exit(1);
  }

  const createdWebhook = (await createResponse.json()) as { webhook: BugherdWebhook };

  console.log("Webhook created successfully!");
  console.log(`ID: ${createdWebhook.webhook.id}`);
  console.log(`Target URL: ${createdWebhook.webhook.target_url}`);
  console.log(`Event: ${createdWebhook.webhook.event}`);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
