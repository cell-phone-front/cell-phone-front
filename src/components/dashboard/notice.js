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

export default function DashboardNotice({ onCountChange }) {
  const token = useToken((s) => s.token);

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

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

        if (typeof onCountChange === "function") {
          onCountChange(arr.length);
        }
      })
      .catch((err) => {
        console.error(err);
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

  // ✅ 최신순 5개
  const rows = useMemo(() => {
    const sorted = [...(notices || [])].sort((a, b) => {
      const ta = toTs(a?.createdAt ?? a?.date);
      const tb = toTs(b?.createdAt ?? b?.date);
      return tb - ta; // 최신 먼저
    });

    return sorted.slice(0, 5).map((n) => ({
      id: getId(n),
      title: n?.title ?? "",
      writer: n?.memberName ?? n?.writer ?? "-",
      createdAt: fmtDate(n?.createdAt ?? n?.date ?? ""),
      pinned: isPinned(n),
    }));
  }, [notices]);

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* ✅ 내부 헤더 완전 제거 */}

      <div className="flex-1 min-h-0 overflow-auto px-4 py-0 pretty-scroll">
        {loading ? (
          <div className="py-6 text-[11px] text-slate-500">불러오는 중…</div>
        ) : loadError ? (
          <div className="py-6 text-[11px] text-red-600">{loadError}</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-[11px] text-slate-500">
            공지사항이 없습니다.
          </div>
        ) : (
          // ✅ 라운드 제거 + 더 깔끔한 테이블
          <table className="w-full table-fixed text-[11px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-left text-[10px] font-semibold text-slate-500 border-b border-slate-200">
                <th className="pt-1 pb-1.5">제목</th>
                <th className=" w-[70px]">작성자</th>
                <th className=" w-[90px]">작성일</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.id}-${idx}`}
                  className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
                  onClick={() => {
                    // 상세 페이지 있으면 교체
                    // window.location.href = `/notice/${r.id}`;
                    window.location.href = "/notice";
                  }}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.pinned ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700">
                          <Pin className="h-3 w-3" />
                          고정
                        </span>
                      ) : null}

                      <div
                        className="pr-5 min-w-0 truncate font-semibold text-slate-900 hover:text-indigo-800"
                        title={r.title || ""}
                      >
                        {r.title || "-"}
                      </div>
                    </div>
                  </td>

                  <td className="py-2 truncate text-slate-700">{r.writer}</td>

                  <td className="py-2 tabular-nums text-slate-600">
                    {r.createdAt || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
