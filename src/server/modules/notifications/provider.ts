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

function emailHtml(payload: NotificationEmailPayload): string {
  const linkHtml = payload.link
    ? `<p style="margin:20px 0 0;text-align:center"><a style="display:inline-block;background:#0a7a75;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif" href="${payload.link}">افتح في التطبيق</a></p>`
    : "";
  return `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;padding:24px;font-family:Arial,'Segoe UI',sans-serif;background:#f6f7f5">
    <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:#0a7a75;color:#fff;padding:16px 24px;font-size:18px;font-weight:700">ثانويكو.</div>
      <div style="padding:24px"><h1 style="margin:0 0 12px;font-size:20px;color:#17302d">${payload.subject}</h1>
      <p style="margin:0;line-height:1.8;color:#40504d;white-space:pre-line">${payload.bodyAr}</p>${linkHtml}</div>
    </div></body></html>`;
}

export const resendNotificationProvider: NotificationProvider = {
  name: "resend",
  async send(payload) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? "Thanawico <no-reply@thanawico.com>";
    if (!apiKey) {
      return { ok: false, error: "RESEND_API_KEY is not set" };
    }
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [payload.to],
          subject: payload.subject,
          html: emailHtml(payload),
        }),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "network error";
      await logServerEvent("error", "notification.email.failed", {
        provider: "resend",
        to: maskEmail(payload.to),
        subject: payload.subject,
        error: message,
      });
      return { ok: false, error: message };
    }
    if (!res.ok) {
      await logServerEvent("error", "notification.email.failed", {
        provider: "resend",
        to: maskEmail(payload.to),
        subject: payload.subject,
        status: res.status,
      });
      return { ok: false, error: `resend_http_${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerRef: data.id };
  },
};

const PROVIDERS: Record<string, NotificationProvider> = {
  console: consoleNotificationProvider,
  resend: resendNotificationProvider,
};

export function getNotificationProvider(
  name = process.env.NOTIFICATION_PROVIDER,
): NotificationProvider {
  const resolved = name ?? "console";
  const provider = PROVIDERS[resolved];
  if (!provider) throw new Error(`Unknown NOTIFICATION_PROVIDER: ${resolved}`);
  return provider;
}