const DEV_MAPPING: Record<string, string> = {
  "DEV Manuel Castillo": "ManuelCastillo829",
  "DEV Ricky Cortes": "RickyBv24",
  "DEV Chris Segovia": "csegoviaz",
  "DEV Chris Zapata": "CristhianTwiins",
  "DEV Camilo Escudero": "camiloescudero-ops",
  "DEV Isaac Armijos": "supIsaax",
  "DEV Rory Zambrano": "rorysambrano8000",
};

export function findGithubUsername(tagNames: string[]): string | null {
  for (const tag of tagNames) {
    const normalizedTag = tag.trim();
    if (DEV_MAPPING[normalizedTag]) {
      return DEV_MAPPING[normalizedTag];
    }
  }
  return null;
}

export function getAllDevelopers(): string[] {
  return Object.values(DEV_MAPPING);
}
