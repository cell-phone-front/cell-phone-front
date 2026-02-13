// src/components/dashboard/notice.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useToken } from "@/stores/account-store";
import { getNotices } from "@/api/notice-api";
import { Pin } from "lucide-react";

function fmtDate(v) {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];
  return s.slice(0, 10);
}

function getId(n) {
  return n?.id ?? n?.noticeId ?? n?.notice_id ?? n?._id ?? "";
}

function isPinned(n) {
  const v =
    n?.pinned ??
    n?.isPinned ??
    n?.pin ??
    n?.fixed ??
    n?.top ??
    n?.pinnedYn ??
    n?.pinned_yn;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toUpperCase() === "Y" || v === "1";
  if (typeof v === "number") return v === 1;
  return false;
}

function toTs(v) {
  if (!v) return 0;
  const t = Date.parse(String(v));
  if (!Number.isNaN(t)) return t;
  return 0;
}

export default function DashboardNotice({
  onCountChange,
  onGoNotice,
  limit = 4, // ✅ 위 카드에 4개 정도가 보기 좋음
}) {
  const token = useToken((s) => s.token);

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const goNotice =
    typeof onGoNotice === "function"
      ? onGoNotice
      : () => (window.location.href = "/notice");

  useEffect(() => {
    if (!token) return;

    let alive = true;
    setLoading(true);
    setLoadError("");

    getNotices(token)
      .then((json) => {
        if (!alive) return;
        const list =
          json?.noticeList || json?.notices || json?.items || json?.data || [];
        const arr = Array.isArray(list) ? list : [];
        setNotices(arr);
        if (typeof onCountChange === "function") onCountChange(arr.length);
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(err?.message || "공지사항 불러오기 실패");
        setNotices([]);
        if (typeof onCountChange === "function") onCountChange(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token, onCountChange]);

  // ✅ 고정 먼저 + 최신순
  const rows = useMemo(() => {
    const arr = Array.isArray(notices) ? [...notices] : [];
    arr.sort((a, b) => {
      const pa = isPinned(a) ? 1 : 0;
      const pb = isPinned(b) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ta = toTs(a?.createdAt ?? a?.date);
      const tb = toTs(b?.createdAt ?? b?.date);
      return tb - ta;
    });

    return arr.slice(0, limit).map((n) => ({
      id: getId(n),
      title: n?.title ?? "",
      createdAt: fmtDate(n?.createdAt ?? n?.date ?? ""),
      pinned: isPinned(n),
    }));
  }, [notices, limit]);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4 pretty-scroll">
        {loading ? (
          <div className="py-6 text-[11px] text-slate-500">불러오는 중…</div>
        ) : loadError ? (
          <div className="py-6 text-[11px] text-rose-600">{loadError}</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-[11px] text-slate-500">
            공지사항이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={goNotice}
                className="w-full text-left py-3 hover:bg-slate-50/60 transition rounded-lg px-2 -mx-2"
                title={r.title || ""}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {r.pinned ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 shrink-0">
                      <Pin className="h-3 w-3" />
                      고정
                    </span>
                  ) : null}

                  <div className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-900 hover:text-indigo-700">
                    {r.title || "-"}
                  </div>

                  <div className="shrink-0 text-[10px] text-slate-400 tabular-nums">
                    {r.createdAt || "-"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
