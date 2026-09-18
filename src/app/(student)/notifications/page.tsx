"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  titleAr: string;
  bodyAr: string;
  link: string | null;
  status: "sent" | "pending" | "failed";
  emailStatus: "none" | "pending" | "sent" | "failed";
  readAt: string | null;
  createdAt: string;
};

function timeAgoAr(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load(p: number) {
    try {
      const res = await fetch(`/api/notifications?page=${p}&limit=20`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: NotificationItem[];
        unread: number;
        hasMore: boolean;
      };
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setUnread(data.unread);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let live = true;
    fetch("/api/notifications?page=1&limit=20")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items: NotificationItem[]; unread: number; hasMore: boolean } | null) => {
        if (!live || !data) return;
        setItems(data.items);
        setHasMore(data.hasMore);
        setUnread(data.unread);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  async function openItem(n: NotificationItem) {
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    if (n.link) router.push(n.link);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">الإشعارات</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
              setUnread(0);
              setItems((prev) => prev.map((x) => ({ ...x, readAt: new Date().toISOString() })));
            }}
            className="text-sm font-medium text-brand-strong hover:underline"
          >
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      <p className="text-sm text-ink-mute">
        {unread > 0 ? `لديك ${unread} إشعار (إشعارات) غير مقروء.` : "كل الإشعارات مقروءة."}
      </p>

      {loading && <p className="py-8 text-center text-sm text-ink-mute">جارٍ التحميل…</p>}

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-mute">
          لا إشعارات بعد.
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => openItem(n)}
              className={`w-full rounded-xl border border-line bg-surface p-4 text-start hover:border-ink-mute ${
                n.readAt ? "opacity-80" : "border-brand-300"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-bold text-ink">{n.titleAr}</span>
                <span className="tnum shrink-0 text-xs text-ink-mute">{timeAgoAr(n.createdAt)}</span>
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-mute">{n.bodyAr}</span>
              {n.emailStatus === "failed" && (
                <span className="mt-2 inline-block rounded-full bg-danger-bg px-2 py-0.5 text-xs text-bad">
                  فشل إرسال نسخة البريد
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => {
            const next = page + 1;
            setPage(next);
            load(next);
          }}
          className="block w-full rounded-lg border border-line bg-surface py-2.5 text-sm font-bold text-ink hover:border-ink-mute"
        >
          تحميل المزيد
        </button>
      )}
    </div>
  );
}