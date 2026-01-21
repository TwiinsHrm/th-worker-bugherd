interface DeveloperInfo {
  github: string;
  discordId: string;
}

const DEV_MAPPING: Record<string, DeveloperInfo> = {
  "DEV Manuel Castillo": { github: "ManuelCastillo829", discordId: "1057656769041666088" },
  "DEV Ricky Cortes": { github: "RickyBv24", discordId: "748912747554799638" },
  "DEV Chris Segovia": { github: "csegoviaz", discordId: "601246979028156426" },
  "DEV Chris Zapata": { github: "CristhianTwiins", discordId: "1209536555077599265" },
  "DEV Camilo Escudero": { github: "camiloescudero-ops", discordId: "1424842769607688192" },
  "DEV Isaac Armijos": { github: "supIsaax", discordId: "752559714403090514" },
  "DEV Rory Zambrano": { github: "rorysambrano8000", discordId: "751903164914991206" },
  "DEV Marco Perez": { github: "marcoperez-twiins", discordId: "1448675240514158632" },
};

export function findGithubUsername(tagNames: string[]): string | null {
  for (const tag of tagNames) {
    const normalizedTag = tag.trim();
    if (DEV_MAPPING[normalizedTag]) {
      return DEV_MAPPING[normalizedTag].github;
    }
  }
  return null;
}

export function findDiscordId(tagNames: string[]): string | null {
  for (const tag of tagNames) {
    const normalizedTag = tag.trim();
    if (DEV_MAPPING[normalizedTag]) {
      return DEV_MAPPING[normalizedTag].discordId;
    }
  }
  return null;
}

export function getDiscordIdByGithub(githubUsername: string): string | null {
  for (const dev of Object.values(DEV_MAPPING)) {
    if (dev.github === githubUsername) {
      return dev.discordId;
    }
  }
  return null;
}

export function getAllDevelopers(): string[] {
  return Object.values(DEV_MAPPING).map((dev) => dev.github);
}
