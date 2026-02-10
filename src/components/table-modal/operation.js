import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { getOperations } from "@/api/operation-api";

function cryptoId() {
  try {
    return (
      globalThis.crypto?.randomUUID?.() || `rid-${Date.now()}-${Math.random()}`
    );
  } catch {
    return `rid-${Date.now()}-${Math.random()}`;
  }
}

export default function OperationFullModal({ open, onClose, token }) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !token) return;

    let alive = true;
    setErr("");
    setKeyword(""); // 모달 열 때 검색 초기화

    getOperations(token, "")
      .then((json) => {
        if (!alive) return;
        const list = json.operationList || json.items || json.data || [];
        const mapped = (list || []).map((r) => ({
          ...r,
          _rid: r._rid || cryptoId(),
        }));
        setRows(mapped);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || "전체 보기 불러오기 실패");
      });

    return () => {
      alive = false;
    };
  }, [open, token]);

  const data = useMemo(() => rows || [], [rows]);

  const filteredData = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return data;

    return data.filter((r) =>
      [r.id, r.name, r.description]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data, keyword]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-6">
      <div className="w-[min(1200px,95vw)] h-[min(760px,90vh)] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col">
        {/* 헤더: 라우팅/프로덕트 모달과 동일 */}
        <div className="shrink-0 px-4 py-3 bg-indigo-900 text-white flex items-center gap-3">
          <div className="text-[14px] font-extrabold shrink-0">
            Operation 전체 보기
          </div>

          {/* 검색창 */}
          <div className="ml-auto relative w-[380px]">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색 (Id / Name / Description)"
              className="
                h-8 w-full rounded-md
                bg-white text-slate-900
                px-3 text-[12px]
                outline-none
                focus:ring-2 focus:ring-indigo-300
                placeholder:text-slate-400
              "
            />
            {keyword ? (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  h-7 w-7 rounded-lg
                  text-slate-500 transition
                  hover:bg-slate-100
                "
                aria-label="clear"
              >
                ✕
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-center shrink-0"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {err ? (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {err}
          </div>
        ) : null}

        {/* 표 */}
        <div className="flex-1 min-h-0 overflow-auto pretty-scroll">
          <table className="w-full table-fixed border-collapse text-[12px]">
            <colgroup>
              <col style={{ width: "70px" }} /> {/* No */}
              <col style={{ width: "22%" }} /> {/* Id */}
              <col style={{ width: "26%" }} /> {/* Name */}
              <col style={{ width: "52%" }} /> {/* Description */}
            </colgroup>

            <thead className="sticky top-0 z-10">
              <tr className="text-left">
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold text-center">
                  No
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold">
                  Id
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold">
                  Name
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold">
                  Description
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((r, i) => (
                <tr key={r._rid} className="hover:bg-indigo-50 transition">
                  <td className="border-b px-3 py-2 text-center text-slate-500">
                    {i + 1}
                  </td>
                  <td className="border-b px-3 py-2">{r.id ?? "-"}</td>
                  <td className="border-b px-3 py-2">{r.name ?? "-"}</td>
                  <td className="border-b px-3 py-2">{r.description ?? "-"}</td>
                </tr>
              ))}

              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-16 text-center text-slate-500"
                  >
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 px-4 py-3 border-t bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border text-[12px] font-semibold hover:bg-slate-50 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
