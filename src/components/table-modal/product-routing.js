// src/components/table-modal/product-routing.js
import React, { useEffect, useMemo, useState } from "react";
import { X, Search, Route } from "lucide-react";
import { getProductRoutings } from "@/api/product-routing-api";

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

function Clamp1({ children, className = "" }) {
  return (
    <div
      className={["truncate whitespace-nowrap overflow-hidden", className].join(
        " ",
      )}
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
        "px-4 py-2", // ✅ 컴팩트 + 줄높이 안정
        "text-[13px] text-slate-800",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}

export default function ProductRoutingFullModal({ open, onClose, token }) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !token) return;

    let alive = true;
    setErr("");
    setKeyword("");

    getProductRoutings(token, "")
      .then((json) => {
        if (!alive) return;
        const list =
          json.productRoutingList ||
          json.routingList ||
          json.items ||
          json.data ||
          [];

        const mapped = (list || []).map((r) => ({
          ...r,
          _rid: r._rid || cryptoId(),

          // ✅ 표준화
          id: r.id ?? r.routingId ?? r.productRoutingId ?? "",
          name: r.name ?? r.routingName ?? r.productRoutingName ?? "",
          productId: r.productId ?? r.product_id ?? "",
          operationId: r.operationId ?? r.operation_id ?? "",
          operationSeq:
            r.operationSeq ??
            r.operation_seq ??
            r.seq ??
            r.sequence ??
            r.step ??
            "",
          description: r.description ?? r.desc ?? "",
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

  // ✅ ESC 닫기
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
      [r.productId, r.name, r.operationId, r.id, r.operationSeq, r.description]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data, keyword]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-[min(1200px,95vw)] h-[min(760px,90vh)] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/5">
        {/* ===== Header (Accounts 톤) ===== */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-sm shrink-0">
                <Route className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-[18px] font-semibold text-slate-900 truncate">
                    공정 순서 전체 보기
                  </div>
                </div>
                <div className="mt-0.5 text-[12px] text-slate-500 truncate">
                  검색은 품번/공정경로/공정코드/순서/설명 기준으로 동작합니다.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-[380px]">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="검색 (품번/공정경로/공정코드/순서/설명)"
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

        {/* ===== Table ===== */}
        <div className="flex-1 min-h-0 overflow-auto pretty-scroll">
          <table className="w-full table-fixed border-collapse">
            {/* ✅ 두 줄 방지용 폭 재배치 */}
            <colgroup>
              <col style={{ width: "70px" }} /> {/* 번호 */}
              <col style={{ width: "16%" }} /> {/* productId */}
              <col style={{ width: "20%" }} /> {/* name */}
              <col style={{ width: "16%" }} /> {/* operationId */}
              <col style={{ width: "16%" }} /> {/* id */}
              <col style={{ width: "8%" }} /> {/* seq */}
              <col style={{ width: "24%" }} /> {/* desc */}
            </colgroup>

            <thead className="sticky top-0 z-10">
              <tr>
                <Th className="!text-center !px-2">번호</Th>
                <Th>생산 대상 품번</Th>
                <Th>공정 경로</Th>
                <Th>공정 코드</Th>
                <Th>공정 순서 ID</Th>
                <Th className="!text-center">순서</Th>
                <Th>설명</Th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((r, i) => (
                <tr key={r._rid} className="hover:bg-indigo-50 transition">
                  <Td className="!text-center !px-2 tabular-nums text-slate-500">
                    {i + 1}
                  </Td>

                  <Td>
                    <Clamp1>{r.productId ?? "-"}</Clamp1>
                  </Td>

                  <Td>
                    <Clamp1>{r.name ?? "-"}</Clamp1>
                  </Td>

                  <Td>
                    <Clamp1>{r.operationId ?? "-"}</Clamp1>
                  </Td>

                  <Td>
                    <Clamp1>{r.id ?? "-"}</Clamp1>
                  </Td>

                  <Td className="!text-center tabular-nums">
                    <Clamp1>{r.operationSeq ?? "-"}</Clamp1>
                  </Td>

                  <Td>
                    <Clamp1>{r.description ?? "-"}</Clamp1>
                  </Td>
                </tr>
              ))}

              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-[13px] text-slate-500"
                  >
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* ===== Footer ===== */}
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
