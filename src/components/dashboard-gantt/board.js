"use client";

import React, { useMemo } from "react";
import LeftMeta from "./left";
import RightBars from "./right";
import { barOk, safeText } from "./util";

export default function DashboardGanttBoard({ groups = [], meta = null }) {
  const ROW_H = 16; // ✅ 13은 너무 빡셉니다 (pill/라인하이트 때문에 잘림)
  const TOP_H = 24;

  const palette = [
    { dot: "bg-indigo-500/80", bar: "bg-indigo-500/70" },
    { dot: "bg-indigo-400/70", bar: "bg-indigo-400/60" },
    { dot: "bg-slate-500/60", bar: "bg-slate-500/55" },
    { dot: "bg-slate-400/60", bar: "bg-slate-400/55" },
  ];

  const rowsAll = useMemo(() => {
    const out = [];
    const gs = Array.isArray(groups) ? groups : [];

    for (let gi = 0; gi < gs.length; gi++) {
      const g = gs[gi];
      const ops = Array.isArray(g?.operations) ? g.operations : [];

      for (let oi = 0; oi < ops.length; oi++) {
        const op = ops[oi];
        const tasks = Array.isArray(op?.tasks) ? op.tasks : [];
        const t = tasks.find((x) => barOk(x?.startAt, x?.endAt)) || tasks[0];
        if (!t) continue;

        const label =
          safeText(op?.operationName) ||
          safeText(op?.name) ||
          safeText(t?.title) ||
          "작업";

        const value = Number(t?._count ?? tasks.length ?? 1);
        const key = String(op?.id ?? op?.operationId ?? `${gi}-${oi}`);
        const p = palette[(gi + oi) % palette.length];

        out.push({ key, label, value, dotClass: p.dot, barClass: p.bar });
      }
    }

    out.sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    return out;
  }, [groups]);

  if (!rowsAll.length) return null;

  return (
    <div className="h-full w-full bg-white flex flex-col min-h-0 overflow-hidden">
      {/* header */}
      <div
        className="shrink-0 grid grid-cols-[28%_15%_57%] gap-x-1 px-2"
        style={{ height: TOP_H }}
      >
        <div className="flex items-end pb-1 pl-1">
          <div className="text-[11px] font-semibold text-slate-700">
            최신 정보
          </div>
        </div>
        <div className="flex items-end pb-1">
          <div className="text-[11px] font-semibold text-slate-700">공정</div>
        </div>
        <div className="flex items-end pb-1">
          <div className="text-[11px] font-semibold text-slate-700">작업량</div>
        </div>
      </div>

      <div className="shrink-0 h-px bg-slate-100/80" />

      {/* body */}
      <div className="flex-1 min-h-0 grid grid-cols-[28%_15%_57%] gap-x-1 px-2 py-2">
        {/* meta */}
        <div className="min-w-0 min-h-0 pr-1 overflow-hidden">
          <LeftMeta meta={meta} />
        </div>

        {/* 공정 */}
        <div className="min-w-0 min-h-0 overflow-hidden">
          <div className="px-1">
            {rowsAll.map((r) => (
              <div
                key={r.key}
                className="group flex items-center gap-1.5 rounded-md px-1.5 hover:bg-slate-50/80"
                style={{ height: ROW_H }}
                title={r.label}
              >
                <span
                  className={["h-1.5 w-1.5 rounded-full", r.dotClass].join(" ")}
                />
                <div className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 group-hover:text-slate-900">
                  {r.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 작업량 */}
        <div className="min-w-0 min-h-0 overflow-hidden">
          <RightBars rows={rowsAll} rowH={ROW_H} />
        </div>
      </div>
    </div>
  );
}
