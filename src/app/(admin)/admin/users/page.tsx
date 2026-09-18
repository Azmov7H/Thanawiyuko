"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

type User = {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin" | "super";
  status: "active" | "suspended" | "deleted";
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  student: "طالب",
  teacher: "مدرس",
  admin: "مشرف",
  super: "مشرف أعلى",
};

const STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف",
  deleted: "محذوف",
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const client = useQueryClient();

  const list = useQuery({
    queryKey: ["admin-users", q, role, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1" });
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      const r = await fetch(`/api/admin/users?${params}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر التحميل.");
      return d as { viewerRole: string; items: User[]; total: number };
    },
  });

  const mutate = useMutation({
    mutationFn: async (payload: { userId: string; action: string; role?: string }) => {
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.messageAr ?? "تعذر تنفيذ الإجراء.");
      return d;
    },
    onSuccess: () => {
      setError("");
      client.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => setError(e.message),
  });

  const viewerRole = list.data?.viewerRole ?? "admin";
  const canManage = (u: User) =>
    viewerRole === "super" ? u.role !== "super" : u.role === "student" || u.role === "teacher";

  return (
    <div>
      <PageHeader
        title="إدارة المستخدمين"
        description="بحث وإيقاف/تفعيل الحسابات، وتغيير الأدوار (المشرف الأعلى فقط)."
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو البريد"
          aria-label="ابحث بالاسم أو البريد"
          className="min-h-11 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="تصفية حسب الدور"
          className="min-h-11 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
        >
          <option value="">كل الأدوار</option>
          <option value="student">طالب</option>
          <option value="teacher">مدرس</option>
          <option value="admin">مشرف</option>
          <option value="super">مشرف أعلى</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="تصفية حسب الحالة"
          className="min-h-11 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
        </select>
      </div>

      <p className="mt-3 text-sm text-ink-mute">
        الإجمالي: <span className="tnum">{list.data?.total ?? "…"}</span>
      </p>
      {(error || list.isError) && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-bad">
          {error || "تعذر التحميل."}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {list.data?.items.map((u) => (
          <li key={u.id} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{u.name}</p>
                <p className="truncate text-xs text-ink-mute">{u.email}</p>
                <p className="tnum mt-1 text-xs text-ink-mute">
                  {ROLE_LABEL[u.role]} • {STATUS_LABEL[u.status]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {viewerRole === "super" && u.role !== "super" && (
                  <select
                    value={u.role}
                    disabled={mutate.isPending}
                    onChange={(e) => mutate.mutate({ userId: u.id, action: "set-role", role: e.target.value })}
                    aria-label={`دور ${u.name}`}
                    className="min-h-11 rounded-md border border-line bg-surface px-2 py-1.5 text-xs text-ink disabled:opacity-50"
                  >
                    <option value="student">طالب</option>
                    <option value="teacher">مدرس</option>
                    <option value="admin">مشرف</option>
                  </select>
                )}
                {canManage(u) && u.status !== "deleted" && (
                  <Button
                    size="sm"
                    variant={u.status === "active" ? "danger" : "primary"}
                    disabled={mutate.isPending}
                    onClick={() =>
                      mutate.mutate({ userId: u.id, action: u.status === "active" ? "suspend" : "activate" })
                    }
                  >
                    {u.status === "active" ? "إيقاف" : "تفعيل"}
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
        {list.data && list.data.items.length === 0 && (
          <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">
            لا مستخدمون مطابقون.
          </li>
        )}
      </ul>
    </div>
  );
}
