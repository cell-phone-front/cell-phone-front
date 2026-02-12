"use client";

import React, { useMemo } from "react";
import { toMs } from "@/components/gantt/gantt-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* =========================
  utils
========================= */
function minsBetween(startAt, endAt) {
  const s = toMs(startAt);
  const e = toMs(endAt);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return Math.round((e - s) / 60000);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatMins(m) {
  const v = Math.max(0, Number(m) || 0);
  if (v < 60) return `${v}m`;
  const h = Math.floor(v / 60);
  const mm = v % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

function safeLabel(v) {
  const s = String(v ?? "").trim();
  return s || "-";
}

/* =========================
  Donut SVG (hover tooltip on segments)
========================= */
function DonutSvg({ items, size = 150, thickness = 22 }) {
  const data = Array.isArray(items) ? items : [];
  const total = data.reduce((a, b) => a + (Number(b.value) || 0), 0) || 1;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;

  return (
    <TooltipProvider>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(148,163,184,0.22)"
          strokeWidth={thickness}
        />

        {/* segments */}
        {data.map((it, idx) => {
          const v = Math.max(0, Number(it.value) || 0);
          const frac = v / total;

          const dash = frac * c;
          const gap = Math.max(0, c - dash);

          const offset = -acc * c;
          acc += frac;

          const label = safeLabel(it.label);
          const pct = clamp(Math.round((v / total) * 100), 0, 100);

          return (
            <Tooltip key={`${label}-${idx}`}>
              <TooltipTrigger asChild>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  className={[
                    it.colorClass || "text-indigo-500",
                    "cursor-pointer",
                  ].join(" ")}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              </TooltipTrigger>

              <TooltipContent className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 shadow-sm">
                <div className="font-semibold text-slate-900">{label}</div>
                <div className="mt-0.5 text-[11px] text-slate-600">
                  {formatMins(v)} · {pct}%
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* center text */}
        <text
          x="50%"
          y="48%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill="rgb(15 23 42)"
        >
          {Math.round(total / 60)}h
        </text>
        <text
          x="50%"
          y="60%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="10"
          fill="rgb(100 116 139)"
        >
          total
        </text>
      </svg>
    </TooltipProvider>
  );
}

/* =========================
  MachineDonut
========================= */
export default function MachineDonut({
  groups = [],
  title = "기계 분포",
  desc = "작업시간 기준",
  topN = 4,
  size = 150,

  hideHeader = false,
  noFrame = false,

  // ✅ “뚱뚱한 도넛”
  thickness = 22,

  spinOnce = false, // ✅ 추가
}) {
  const { items } = useMemo(() => {
    const gs = Array.isArray(groups) ? groups : [];
    const rows = [];

    for (const g of gs) {
      const tasks = Array.isArray(g?.tasks) ? g.tasks : [];
      let mins = 0;
      for (const t of tasks) mins += minsBetween(t?.startAt, t?.endAt);

      if (mins > 0) {
        rows.push({
          label: safeLabel(
            g?.machineName || g?.machineId || g?.title || "기계",
          ),
          value: mins,
        });
      }
    }

    rows.sort((a, b) => Number(b.value) - Number(a.value));

    const colors = [
      "text-indigo-500",
      "text-sky-500",
      "text-emerald-500",
      "text-gray-600",
      "text-slate-300",
    ];

    const top = rows.slice(0, topN);
    const rest = rows.slice(topN);
    const restSum = rest.reduce((s, x) => s + (Number(x.value) || 0), 0);

    const out = top.map((x, i) => ({ ...x, colorClass: colors[i] }));
    if (restSum > 0)
      out.push({ label: "기타", value: restSum, colorClass: colors[4] });

    return { items: out };
  }, [groups, topN]);

  if (!items.length) {
    return (
      <div className="h-full grid place-items-center text-[11px] text-slate-500">
        기계 데이터 없음
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {!hideHeader ? (
        <div className="shrink-0 px-4 pt-3">
          <div className="text-[13px] font-semibold leading-5 text-slate-900 truncate">
            {title}
          </div>
          <div className="text-[11px] leading-4 text-slate-500 truncate">
            {desc}
          </div>
        </div>
      ) : null}

      <div
        className={
          hideHeader ? "flex-1 min-h-0 p-3" : "flex-1 min-h-0 px-4 pb-4 pt-2"
        }
      >
        <div
          className={
            noFrame
              ? "h-full min-h-0 bg-white grid place-items-center"
              : "h-full min-h-0 rounded-2xl border border-slate-200 bg-white p-3 grid place-items-center"
          }
        >
          <div className={spinOnce ? "donut-spin-once" : ""}>
            <DonutSvg items={items} size={size} thickness={thickness} />
          </div>

          <style jsx>{`
            .donut-spin-once {
              animation: donutSpinOnce 900ms cubic-bezier(0.2, 0.9, 0.2, 1) 1
                both;
              transform-origin: 50% 50%;
            }
            @keyframes donutSpinOnce {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
