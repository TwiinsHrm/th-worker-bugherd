export interface DiscordEmbed {
  title: string;
  color: number;
  fields: DiscordEmbedField[];
  image?: DiscordEmbedImage;
  footer?: DiscordEmbedFooter;
  timestamp?: string;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedImage {
  url: string;
}

export interface DiscordEmbedFooter {
  text: string;
}

export interface DiscordButton {
  type: 2;
  style: 5;
  label: string;
  url: string;
}

export interface DiscordActionRow {
  type: 1;
  components: DiscordButton[];
}

export interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
  components?: DiscordActionRow[];
}

export const DISCORD_COLORS = {
  RED: 16711680,
  GREEN: 65280,
  BLUE: 255,
  YELLOW: 16776960,
  ORANGE: 16753920,
} as const;
