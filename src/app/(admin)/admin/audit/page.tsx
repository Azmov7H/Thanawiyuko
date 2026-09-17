"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type AuditItem = {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  at: string;
};

const ENTITIES = ["", "user", "plan", "payment", "lesson", "question", "exam", "subject", "topic"];
const ACTIONS = [
  "",
  "user.suspend",
  "user.activate",
  "user.set-role",
  "plan.update",
  "payment.refund",
  "content.published",
  "content.archived",
];

export default function AdminAuditPage() {
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");

  const list = useQuery({
    queryKey: ["admin-audit", entity, action],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1" });
      if (entity) params.set("entity", entity);
      if (action) params.set("action", action);
      const r = await fetch(`/api/admin/audit?${params}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { items: AuditItem[]; total: number };
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">سجل التدقيق</h1>
      <p className="mt-1 text-sm text-ink-mute">كل إجراء إداري مسجّل (من، ماذا، قبل/بعد، السبب).</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          aria-label="تصفية حسب الكيان"
          className="min-h-11 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
        >
          {ENTITIES.map((e) => (
            <option key={e || "all"} value={e}>
              {e || "كل الكيانات"}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          aria-label="تصفية حسب الإجراء"
          className="min-h-11 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
        >
          {ACTIONS.map((a) => (
            <option key={a || "all"} value={a}>
              {a || "كل الإجراءات"}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-sm text-ink-mute">
        الإجمالي: <span className="tnum">{list.data?.total ?? "…"}</span>
      </p>
      {list.isError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">
          تعذر التحميل.
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {list.data?.items.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">{a.action}</p>
                <p className="tnum text-xs text-ink-mute">
                  {a.entity}:{a.entityId}
                </p>
              </div>
              <time className="text-xs text-ink-mute" dateTime={a.at}>
                {new Date(a.at).toLocaleString("ar-EG")}
              </time>
            </div>
            {a.reason && <p className="mt-1 text-xs text-ink-soft">السبب: {a.reason}</p>}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-ink-mute">قبل / بعد</summary>
              <pre dir="ltr" className="mt-1 overflow-x-auto rounded-lg bg-base p-2 text-[11px] text-ink-soft">
                {JSON.stringify({ before: a.before, after: a.after }, null, 2)}
              </pre>
            </details>
          </li>
        ))}
        {list.data && list.data.items.length === 0 && (
          <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">
            لا سجلات مطابقة.
          </li>
        )}
      </ul>
    </div>
  );
}
