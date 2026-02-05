// src/components/dashboard/notice.js
import { useEffect, useState, useMemo } from "react";
import { useToken } from "@/stores/account-store";
import { getNotices } from "@/api/notice-api";

export default function DashboardNotice() {
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
        const list = json?.noticeList || [];
        setNotices(list);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err?.message || "공지사항 불러오기 실패");
      })
      .finally(() => setLoading(false));

    return () => {
      alive = false;
    };
  }, [token]);

  const rows = useMemo(() => {
    return (notices || []).slice(0, 6).map((n) => ({
      id: n.id ?? n.noticeId ?? "",
      title: n.title ?? "",
      writer: n.memberName ?? n.writer ?? "-",
      createdAt: n.createdAt ?? n.date ?? "",
    }));
  }, [notices]);

  return (
    <div className="h-full flex flex-col px-2">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">공지사항</div>
          <div className="text-[11px] text-gray-500">{notices.length}건</div>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => (window.location.href = "/notice")}
            className="text-[10px] text-gray-600 hover:underline"
          >
            전체 보기 →
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">불러오는 중…</div>
        ) : loadError ? (
          <div className="p-4 text-sm text-red-600">{loadError}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">공지사항이 없습니다.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-gray-50 text-[10px] text-gray-500">
              <tr className="text-left">
                <th className="px-2 py-1.5 border-b w-[30px]">ID</th>
                <th className="px-2 py-1.5 border-b">제목</th>
                <th className="px-2 py-1.5 border-b w-[70px]">작성자</th>
                <th className="px-2 py-1.5 border-b w-[90px]">작성일</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.id}-${idx}`}
                  className="hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <td className="px-2 py-1.5 font-medium border-b">
                    {r.id || "-"}
                  </td>
                  <td className="px-2 py-1.5 border-b truncate">
                    {r.title || "-"}
                  </td>
                  <td className="px-2 py-1.5 border-b">{r.writer}</td>
                  <td className="px-2 py-1.5 border-b">
                    {r.createdAt?.slice(0, 10) ?? "-"}
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
