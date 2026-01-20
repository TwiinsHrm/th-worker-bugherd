import type {
  BugherdTask,
  DiscordWebhookPayload,
  GithubIssueResponse,
  GithubWebhookPayload,
} from "../types";
import { BUGHERD_PRIORITY_MAP, DISCORD_COLORS } from "../types";

export function buildDiscordNotification(
  task: BugherdTask,
  githubIssue: GithubIssueResponse,
  assignedDeveloper: string | null,
  discordId: string | null
): DiscordWebhookPayload {
  const priorityLabel = task.priority_id
    ? BUGHERD_PRIORITY_MAP[task.priority_id] || "not set"
    : "not set";

  let assigneeText: string;
  if (discordId) {
    assigneeText = `<@${discordId}>`;
  } else if (assignedDeveloper) {
    assigneeText = `@${assignedDeveloper}`;
  } else {
    assigneeText = "Sin asignar";
  }

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
            name: "🔗 Issue",
            value: githubIssue.html_url,
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

export function buildIssueClosedNotification(
  issue: GithubWebhookPayload["issue"],
  closedByDiscordId: string | null
): DiscordWebhookPayload {
  const congratsMessages = [
    "🎉 ¡Bug aplastado!",
    "🏆 ¡Victoria contra los bugs!",
    "💪 ¡Otro bug menos en el mundo!",
    "🚀 ¡Bug eliminado con éxito!",
    "⚡ ¡Bug exterminado!",
  ];

  const randomIndex = Math.floor(Math.random() * congratsMessages.length);
  const congratsMessage = congratsMessages[randomIndex];

  let closedByText: string;
  if (closedByDiscordId) {
    closedByText = `<@${closedByDiscordId}>`;
  } else {
    closedByText = "Un desarrollador";
  }

  const payload: DiscordWebhookPayload = {
    embeds: [
      {
        title: `✅ Issue Cerrado - ${congratsMessage}`,
        color: DISCORD_COLORS.GREEN,
        fields: [
          {
            name: "📋 Título",
            value: issue.title,
            inline: false,
          },
          {
            name: "🦸 Cerrado por",
            value: closedByText,
            inline: true,
          },
          {
            name: "🔢 Issue",
            value: `#${issue.number}`,
            inline: true,
          },
        ],
        footer: {
          text: "GitHub → BugHerd",
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
            url: issue.html_url,
          },
        ],
      },
    ],
  };

  return payload;
}
