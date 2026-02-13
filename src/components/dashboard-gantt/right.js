// src/components/dashboard-gantt/right.js
"use client";

import React, { useMemo } from "react";

export default function RightBars({
  rows = [],
  rowH = 13,

  // ✅ 외부에서 제어 가능하게
  barH = null,
  pillH = null,
}) {
  const max = useMemo(
    () => Math.max(1, ...rows.map((x) => Number(x.value || 0))),
    [rows],
  );

  /* =========================
    height 계산
  ========================= */

  // barH를 안 주면 기존 로직 유지
  const finalBarH = barH != null ? barH : Math.floor(rowH * 0.6);

  const finalPillH = pillH != null ? pillH : Math.max(10, Math.min(14, rowH));

  return (
    <div className="h-full w-full space-y-1">
      {rows.map((r) => {
        const v = Number(r.value || 0);
        const pct = Math.max(2, Math.round((v / max) * 100));

        return (
          <div
            key={r.key}
            className="flex items-center gap-2 px-1 rounded-md hover:bg-slate-50/60"
            style={{ height: rowH }}
            title={`${r.label} (${v})`}
          >
            {/* ================= bar ================= */}
            <div className="flex-1 min-w-0">
              <div
                className="w-full rounded-full bg-slate-100 overflow-hidden"
                style={{ height: finalBarH }}
              >
                <div
                  className={`h-full rounded-full ${r.barClass}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* ================= number ================= */}
            <div className="w-7 flex justify-end">
              <span
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-semibold text-slate-700 tabular-nums"
                style={{
                  height: finalPillH,
                  minWidth: 22,
                  lineHeight: `${finalPillH}px`,
                }}
              >
                {v}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
