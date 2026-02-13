// src/components/table-modal/machine.js
import React, { useEffect, useMemo, useState } from "react";
import { X, Search, Cpu } from "lucide-react";
import { getMachine } from "@/api/machine-api";

/* ===============================
   utils
=============================== */
function cryptoId() {
  try {
    return (
      globalThis.crypto?.randomUUID?.() || `rid-${Date.now()}-${Math.random()}`
    );
  } catch {
    return `rid-${Date.now()}-${Math.random()}`;
  }
}

function normalizeMachineList(payload) {
  const list =
    payload?.machineList ||
    payload?.machines?.machineList ||
    payload?.machines ||
    payload?.items ||
    payload?.data ||
    payload?.machine ||
    [];

  const arr = Array.isArray(list) ? list : list ? [list] : [];

  return (arr || []).map((m) => ({
    ...m,
    _rid: m._rid || cryptoId(),
    id:
      m.id ??
      m.machineId ??
      m.machine_id ??
      m.machineID ??
      m.machineNo ??
      m.machine_no ??
      "",
    name: m.name ?? m.machineName ?? m.machine_name ?? m.machineNM ?? "",
    koreanName: m.koreanName ?? m.korean_name ?? m.machineKoreanName ?? "",
    description: m.description ?? m.desc ?? m.machineDesc ?? "",
  }));
}

function Clamp2({ children, className = "" }) {
  return (
    <div
      className={className}
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 2,
        overflow: "hidden",
      }}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </div>
  );
}

function Th({ className = "", children }) {
  return (
    <th
      className={[
        "border-b border-slate-200 bg-slate-50",
        "px-4 py-3",
        "text-left text-[12px] font-semibold text-slate-600",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({ className = "", children }) {
  return (
    <td
      className={[
        "border-b border-slate-100",
        "px-4 py-2.5",
        "text-[13px] text-slate-800",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}

export default function MachineFullModal({ open, onClose, token }) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !token) return;

    let alive = true;
    setErr("");
    setKeyword("");

    getMachine(token, "")
      .then((json) => {
        if (!alive) return;
        const list = normalizeMachineList(json);
        setRows(list);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || "Machine 전체 보기 불러오기 실패");
      });

    return () => {
      alive = false;
    };
  }, [open, token]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const data = useMemo(() => rows || [], [rows]);

  const filteredData = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return data;

    return data.filter((r) =>
      [r.id, r.name, r.koreanName, r.description]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data, keyword]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-[min(1200px,95vw)] h-[min(760px,90vh)] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/5">
        {/* Header (Tasks 모달 톤) */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-sm shrink-0">
                <Cpu className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="text-[18px] font-semibold text-slate-900 truncate">
                  기계 전체 보기
                </div>
                <div className="mt-0.5 text-[12px] text-slate-500 truncate">
                  검색은 기계 품번/이름/설명 기준으로 동작합니다.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-[420px]">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="검색 (품번/이름/설명)"
                  className="
                    h-10 w-full rounded-full
                    border border-slate-200 bg-white
                    pl-9 pr-10 text-[13px]
                    outline-none transition
                    hover:border-slate-300
                    focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                    placeholder:text-[12px] placeholder:text-slate-400
                  "
                />
                {keyword ? (
                  <button
                    type="button"
                    onClick={() => setKeyword("")}
                    className="
                      absolute right-2 top-1/2 -translate-y-1/2
                      h-8 w-8 rounded-full
                      grid place-items-center
                      text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                    "
                    aria-label="clear"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="
                  h-10 w-10 rounded-full
                  border border-slate-200 bg-white
                  text-slate-500
                  hover:bg-slate-50 hover:text-slate-800
                  transition grid place-items-center
                "
                aria-label="close"
                title="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {err}
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto pretty-scroll">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "72px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "auto" }} />
            </colgroup>

            <thead className="sticky top-0 z-10">
              <tr>
                <Th className="!text-center !px-2">번호</Th>
                <Th>기계 품번</Th>
                <Th>기계 이름</Th>
                <Th>기계 이름(KR)</Th>
                <Th>기계 설명</Th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((r, i) => (
                <tr key={r._rid} className="hover:bg-indigo-50 transition">
                  <Td className="!text-center !px-2 tabular-nums text-slate-500">
                    {i + 1}
                  </Td>

                  <Td className="align-top">
                    <Clamp2 className="whitespace-normal break-words leading-5 text-[13px]">
                      {r.id ?? "-"}
                    </Clamp2>
                  </Td>

                  <Td className="align-top">
                    <Clamp2 className="whitespace-normal break-words leading-5 text-[13px]">
                      {r.name ?? "-"}
                    </Clamp2>
                  </Td>

                  <Td className="align-top">
                    <Clamp2 className="whitespace-normal break-words leading-5 text-[13px]">
                      {r.koreanName ?? "-"}
                    </Clamp2>
                  </Td>

                  <Td className="align-top">
                    <Clamp2 className="whitespace-normal break-words leading-5 text-[13px] text-slate-700">
                      {r.description ?? "-"}
                    </Clamp2>
                  </Td>
                </tr>
              ))}

              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-16 text-center text-[13px] text-slate-500"
                  >
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <div className="text-[12px] text-slate-500">
            총{" "}
            <span className="font-semibold text-slate-900 tabular-nums">
              {data.length.toLocaleString()}
            </span>
            건{" "}
            {keyword ? (
              <span className="text-slate-400">
                · 검색 결과{" "}
                <span className="font-semibold text-slate-900 tabular-nums">
                  {filteredData.length.toLocaleString()}
                </span>
                건
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              h-10 px-5 rounded-full
              border border-slate-200 bg-white
              text-[13px] font-semibold text-slate-700
              hover:bg-slate-50
              transition
            "
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
