# th-worker-bugherd

Cloudflare Worker for bidirectional sync between BugHerd and GitHub with Discord notifications.

## Features

- **BugHerd → GitHub**: Automatically creates GitHub issues from BugHerd tasks
- **GitHub → BugHerd**: Syncs issue status back to BugHerd when closed/reopened
- **Discord Notifications**: Sends rich notifications for new bugs
- **Auto-assignment**: Maps BugHerd tags to GitHub usernames

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Cloudflare secrets

```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put BUGHERD_API_KEY
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put DISCORD_WEBHOOK_TH_APP
```

### 3. Deploy

```bash
npm run deploy
```

### 4. Setup webhooks

```bash
# Set environment variables
export BUGHERD_API_KEY=your_api_key
export GITHUB_TOKEN=your_token
export GITHUB_WEBHOOK_SECRET=your_secret
export WORKER_URL=https://th-worker-bugherd.your-subdomain.workers.dev

# Create BugHerd webhook
npm run setup:bugherd

# Create GitHub webhook
npm run setup:github
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /webhook/bugherd` | Receives BugHerd task_create events |
| `POST /webhook/github` | Receives GitHub issue events |
| `POST /health` | Health check |

## Developer Mapping

Edit `src/config/developers.ts` to update the tag-to-username mapping:

```typescript
const DEV_MAPPING: Record<string, string> = {
  "DEV Manuel Castillo": "ManuelCastillo829",
  "DEV Ricky Cortes": "RickyBv24",
  // ...
};
```

## Project Mapping

Edit `src/config/projects.ts` to add new projects:

```typescript
const PROJECT_MAPPING: ProjectMapping[] = [
  {
    bugherdProjectId: 464238,
    githubOwner: "TwiinsHrm",
    githubRepo: "th-app",
    discordWebhookEnvKey: "DISCORD_WEBHOOK_TH_APP",
    closedStatusColumn: "in review",
  },
];
```

## Development

```bash
npm run dev
```

## License

Private - TwiinsHrm
