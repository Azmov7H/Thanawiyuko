"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  titleAr: string;
  bodyAr: string;
  link: string | null;
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function refresh() {
    try {
      const res = await fetch("/api/notifications?limit=6");
      if (!res.ok) return;
      const data = (await res.json()) as { items: NotificationItem[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* silent — bell stays idle */
    }
  }

  useEffect(() => {
    let live = true;
    const poll = () => {
      fetch("/api/notifications?limit=6")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { items: NotificationItem[]; unread: number } | null) => {
          if (!live || !data) return;
          setItems(data.items);
          setUnread(data.unread);
        })
        .catch(() => {
          /* silent — bell stays idle */
        });
    };
    poll();
    const timer = setInterval(poll, 60_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function openItem(n: NotificationItem) {
    setOpen(false);
    if (!n.readAt) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* ignore */
      }
    }
    router.push(n.link || "/notifications");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="الإشعارات"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) refresh();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-base hover:text-ink"
      >
        <span aria-hidden className="text-lg leading-none">&#128276;</span>
        {unread > 0 && (
          <span className="tnum absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-20 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-sm font-bold text-ink">الإشعارات</span>
            <button
              type="button"
              className="text-xs font-medium text-brand-strong hover:underline"
              onClick={async () => {
                await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
                setUnread(0);
                refresh();
              }}
            >
              تحديد الكل كمقروء
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-ink-mute">لا إشعارات بعد.</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={`block w-full border-b border-line px-3 py-2.5 text-start last:border-b-0 hover:bg-base ${
                    n.readAt ? "" : "bg-brand-tint/50"
                  }`}
                >
                  <span className="block truncate text-sm font-bold text-ink">{n.titleAr}</span>
                  <span className="mt-0.5 block text-xs text-ink-mute">
                    {timeAgoAr(n.createdAt)}
                    {!n.readAt && <span className="me-1 ms-1 text-brand-strong">• جديد</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-3 py-2 text-center text-xs font-bold text-brand-strong hover:bg-base"
          >
            عرض كل الإشعارات
          </Link>
        </div>
      )}
    </div>
  );
}