import type {
  BugherdTask,
  DiscordWebhookPayload,
  GithubIssueResponse,
} from "../types";
import { BUGHERD_PRIORITY_MAP, DISCORD_COLORS } from "../types";

export function buildDiscordNotification(
  task: BugherdTask,
  githubIssue: GithubIssueResponse,
  assignedDeveloper: string | null
): DiscordWebhookPayload {
  const priorityLabel = task.priority_id
    ? BUGHERD_PRIORITY_MAP[task.priority_id] || "not set"
    : "not set";

  const assigneeText = assignedDeveloper
    ? `@${assignedDeveloper}`
    : "Sin asignar";

  const descriptionPreview = task.description
    ? task.description.substring(0, 200) +
      (task.description.length > 200 ? "..." : "")
    : "Sin descripción";

  const payload: DiscordWebhookPayload = {
    embeds: [
      {
        title: "🐛 Nuevo Bug Reportado",
        color: DISCORD_COLORS.RED,
        fields: [
          {
            name: "📋 Título",
            value: githubIssue.title,
            inline: false,
          },
          {
            name: "👤 Asignado a",
            value: assigneeText,
            inline: true,
          },
          {
            name: "🔥 Prioridad",
            value: priorityLabel,
            inline: true,
          },
          {
            name: "🔗 URL",
            value: task.url || "N/A",
            inline: false,
          },
          {
            name: "📝 Descripción",
            value: descriptionPreview,
            inline: false,
          },
        ],
        footer: {
          text: "BugHerd → GitHub",
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Ver en GitHub",
            url: githubIssue.html_url,
          },
          {
            type: 2,
            style: 5,
            label: "Ver en BugHerd",
            url: task.admin_link,
          },
        ],
      },
    ],
  };

  if (task.screenshot_url) {
    payload.embeds[0].image = {
      url: task.screenshot_url,
    };
  }

  return payload;
}
