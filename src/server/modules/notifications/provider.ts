import { logServerEvent } from "@/server/logger";

export type NotificationEmailPayload = {
  to: string;
  subject: string;
  bodyAr: string;
  link?: string | null;
};

export type NotificationProviderResult =
  | { ok: true; providerRef?: string }
  | { ok: false; error: string };

export interface NotificationProvider {
  name: string;
  send(payload: NotificationEmailPayload): Promise<NotificationProviderResult>;
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return "***@***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.indexOf(".");
  const domainHead = dot > 0 ? domain.slice(0, dot) : domain;
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}@${domainHead[0]}***`;
}

export const consoleNotificationProvider: NotificationProvider = {
  name: "console",
  async send(payload) {
    await logServerEvent("info", "notification.email.sent", {
      provider: "console",
      to: maskEmail(payload.to),
      subject: payload.subject,
    });
    return { ok: true };
  },
};

const PROVIDERS: Record<string, NotificationProvider> = {
  console: consoleNotificationProvider,
};

export function getNotificationProvider(
  name = process.env.NOTIFICATION_PROVIDER,
): NotificationProvider {
  const resolved = name ?? "console";
  const provider = PROVIDERS[resolved];
  if (!provider) throw new Error(`Unknown NOTIFICATION_PROVIDER: ${resolved}`);
  return provider;
}