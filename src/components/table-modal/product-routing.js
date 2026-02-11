// src/components/table-modal/product-routing.js
import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
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

function pickList(json) {
  return (
    json?.routingList ||
    json?.productRoutingList ||
    json?.items ||
    json?.data ||
    []
  );
}

function normalizeRow(r) {
  return {
    ...r,
    _rid: r._rid || cryptoId(),
    flag: r.flag ?? "saved",
    id: r.id ?? r.routingId ?? r.productRoutingId ?? "",
    name: r.name ?? r.routingName ?? "",
    productId: r.productId ?? r.product_id ?? r.prodId ?? "",
    operationId: r.operationId ?? r.operation_id ?? r.opId ?? "",
    operationSeq:
      r.operationSeq ?? r.operation_seq ?? r.seq ?? r.sequence ?? r.step ?? "",
    description: r.description ?? r.desc ?? "",
  };
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

export default function ProductRoutingFullModal({ open, onClose, token }) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  // ✅ ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !token) return;

    let alive = true;
    setErr("");
    setKeyword("");

    getProductRoutings(token, "")
      .then((json) => {
        if (!alive) return;
        const list = pickList(json);
        setRows((list || []).map(normalizeRow));
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
      [r.id, r.name, r.productId, r.operationId, r.operationSeq, r.description]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data, keyword]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-6">
      <div className="w-[min(1200px,95vw)] h-[min(760px,90vh)] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="shrink-0 px-4 py-3 bg-indigo-900 text-white flex items-center gap-3">
          <div className="text-[14px] font-extrabold shrink-0">
            공정 순서 전체 보기
          </div>

          {/* 검색 */}
          <div className="ml-auto relative w-[420px]">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색 (이름 / 설명)"
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

        <div className="flex-1 min-h-0 overflow-auto pretty-scroll">
          <table className="w-full table-fixed border-collapse text-[12px]">
            <colgroup>
              <col style={{ width: "60px" }} /> {/* No */}
              <col style={{ width: "14%" }} /> {/* Id */}
              <col style={{ width: "16%" }} /> {/* Name */}
              <col style={{ width: "18%" }} /> {/* ProductId */}
              <col style={{ width: "18%" }} /> {/* OperationId */}
              <col style={{ width: "10%" }} /> {/* Seq */}
              <col style={{ width: "24%" }} /> {/* Description */}
            </colgroup>

            <thead className="sticky top-0 z-10">
              <tr className="text-left">
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold text-center">
                  번호
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold whitespace-nowrap">
                  생산 공정 코드
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold whitespace-nowrap">
                  생산 공정 이름(EN)
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold whitespace-nowrap">
                  생산 대상 품번
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold whitespace-nowrap">
                  공정 코드
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold whitespace-nowrap text-center">
                  생산 공정 순서
                </th>
                <th className="border-b bg-slate-50 px-3 py-3 font-semibold">
                  생산 공정 설명
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((r, i) => (
                <tr key={r._rid} className="hover:bg-indigo-50 transition">
                  <td className="border-b px-3 py-2 text-center text-slate-500">
                    {i + 1}
                  </td>

                  <td className="border-b px-3 py-2">
                    <Clamp2 className="whitespace-normal break-words leading-5">
                      {r.id ?? "-"}
                    </Clamp2>
                  </td>

                  <td className="border-b px-3 py-2">
                    <Clamp2 className="whitespace-normal break-words leading-5">
                      {r.name ?? "-"}
                    </Clamp2>
                  </td>

                  <td className="border-b px-3 py-2">
                    <Clamp2 className="whitespace-normal break-words leading-5">
                      {r.productId ?? "-"}
                    </Clamp2>
                  </td>

                  <td className="border-b px-3 py-2">
                    <Clamp2 className="whitespace-normal break-words leading-5">
                      {r.operationId ?? "-"}
                    </Clamp2>
                  </td>

                  <td className="border-b px-3 py-2 text-center">
                    {r.operationSeq ?? "-"}
                  </td>

                  <td className="border-b px-3 py-2 align-top">
                    <Clamp2 className="whitespace-normal break-words leading-5">
                      {r.description ?? "-"}
                    </Clamp2>
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-slate-500"
                  >
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* ✅ 하단: 총 개수 + 닫기 (Task/Operation 모달 패턴과 동일) */}
        <div className="shrink-0 px-4 py-3 border-t bg-white flex justify-between items-center">
          <div className="text-[12px] text-slate-500">
            총 {data.length.toLocaleString()}건
          </div>

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
