import type { BugherdTask } from "../types";
import { BUGHERD_PRIORITY_MAP } from "../types";

export function buildGithubIssueBody(task: BugherdTask): string {
  const priorityLabel = task.priority_id
    ? BUGHERD_PRIORITY_MAP[task.priority_id] || "not set"
    : "not set";

  const selectorInfo = task.selector_info;
  const browser = selectorInfo?.browser || "Unknown";
  const operatingSystem = selectorInfo?.os || "Unknown";
  const resolution = selectorInfo?.resolution || "Unknown";

  const screenshotSection = task.screenshot_url
    ? `### Screenshot\n![Bug Screenshot](${task.screenshot_url})`
    : "";

  const body = `## 🐛 Bug Report

**URL:** ${task.url || "N/A"}
**Reportado por:** ${task.requester_email || "Unknown"}
**Prioridad:** ${priorityLabel}
**BugHerd Task:** #${task.local_task_id}

---

### Descripción
${task.description || "Sin descripción"}

---

${screenshotSection}

---

### Datos Técnicos
| Campo | Valor |
|-------|-------|
| Browser | ${browser} |
| OS | ${operatingSystem} |
| Resolución | ${resolution} |

---

### Links
- 🔗 [Ver en BugHerd](${task.admin_link})
`;

  return body;
}

export function buildGithubIssueTitle(task: BugherdTask): string {
  const maxLength = 100;
  const description = task.description || "Bug sin descripción";
  const firstLine = description.split("\n")[0].trim();

  if (firstLine.length <= maxLength) {
    return firstLine;
  }

  return firstLine.substring(0, maxLength - 3) + "...";
}
