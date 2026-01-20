export interface ProjectMapping {
  bugherdProjectId: number;
  githubOwner: string;
  githubRepo: string;
  discordWebhookEnvKey: string;
  closedStatusColumn: string;
}

const PROJECT_MAPPING: ProjectMapping[] = [
  {
    bugherdProjectId: 464238,
    githubOwner: "TwiinsHrm",
    githubRepo: "th-app",
    discordWebhookEnvKey: "DISCORD_WEBHOOK_TH_APP",
    closedStatusColumn: "in review",
  },
];

export function findProjectByBugherdId(
  bugherdProjectId: number
): ProjectMapping | null {
  const project = PROJECT_MAPPING.find(
    (project) => project.bugherdProjectId === bugherdProjectId
  );
  if (project) {
    return project;
  }
  return null;
}

export function findProjectByGithubRepo(
  owner: string,
  repo: string
): ProjectMapping | null {
  const project = PROJECT_MAPPING.find(
    (project) =>
      project.githubOwner === owner && project.githubRepo === repo
  );
  if (project) {
    return project;
  }
  return null;
}

export function getAllProjects(): ProjectMapping[] {
  return PROJECT_MAPPING;
}
