"use client";

import React, { useMemo } from "react";
import LeftMeta from "./left";
import RightBars from "./right";
import { barOk, safeText } from "./util";

/* =========================
  donut utils
========================= */
function toMsSafe(v) {
  try {
    const d = v instanceof Date ? v : new Date(String(v || ""));
    const t = d.getTime();
    return Number.isFinite(t) ? t : NaN;
  } catch {
    return NaN;
  }
}

// startAt/endAt이 문자열(혹은 Date)로 들어온다고 가정
function minsBetween(startAt, endAt) {
  const s = toMsSafe(startAt);
  const e = toMsSafe(endAt);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return Math.round((e - s) / 60000);
}

function formatMins(m) {
  const v = Math.max(0, Number(m) || 0);
  if (v < 60) return `${v}m`;
  const h = Math.floor(v / 60);
  const mm = v % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

/* =========================
  Donut SVG
========================= */
function DonutSvg({ items, size = 140, thickness = 14 }) {
  const data = Array.isArray(items) ? items : [];
  const total = data.reduce((a, b) => a + (Number(b.value) || 0), 0) || 1;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(148,163,184,0.25)"
        strokeWidth={thickness}
      />

      {/* segments */}
      {data.map((it, idx) => {
        const v = Number(it.value) || 0;
        const frac = v / total;
        const dash = frac * c;
        const gap = c - dash;

        const offset = -acc * c;
        acc += frac;

        return (
          <circle
            key={`${it.label}-${idx}`}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            strokeLinecap="round"
            className={it.colorClass || "text-indigo-500"}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
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
  );
}

/* =========================
  build machine donut from groups
  - groups: product->operations->tasks 구조에서 task.machineName/machineId로 집계
========================= */
function buildMachineItemsFromGroups(groups, topN = 4) {
  const gs = Array.isArray(groups) ? groups : [];
  const map = new Map(); // key -> { label, mins }

  for (const g of gs) {
    const ops = Array.isArray(g?.operations) ? g.operations : [];
    for (const op of ops) {
      const tasks = Array.isArray(op?.tasks) ? op.tasks : [];
      for (const t of tasks) {
        if (!barOk(t?.startAt, t?.endAt)) continue;

        const label =
          safeText(t?.machineName) ||
          safeText(t?.machine) ||
          safeText(t?.machineId) ||
          safeText(op?.machineName) ||
          safeText(op?.machineId) ||
          "기계";

        const m = minsBetween(t?.startAt, t?.endAt);
        if (m <= 0) continue;

        map.set(label, (map.get(label) || 0) + m);
      }
    }
  }

  const arr = Array.from(map.entries())
    .map(([label, mins]) => ({ label, value: mins }))
    .sort((a, b) => Number(b.value) - Number(a.value));

  if (!arr.length) return [];

  const colors = [
    "text-indigo-500",
    "text-sky-500",
    "text-emerald-500",
    "text-amber-500",
    "text-slate-500",
  ];

  const top = arr.slice(0, topN).map((x, i) => ({
    ...x,
    colorClass: colors[i],
  }));

  const rest = arr.slice(topN);
  const restSum = rest.reduce((s, x) => s + (Number(x.value) || 0), 0);
  if (restSum > 0)
    top.push({ label: "기타", value: restSum, colorClass: colors[4] });

  return top;
}

function SectionTitle({ left, mid, right, height }) {
  return (
    <div
      className="shrink-0 grid grid-cols-[1fr_2fr_1fr] gap-x-3 px-3"
      style={{ height }}
    >
      <div className="flex items-end pb-1">
        <div className="text-[11px] font-semibold text-slate-700">{left}</div>
      </div>

      <div className="flex items-end pb-1">
        <div className="text-[11px] font-semibold text-slate-700">{mid}</div>
      </div>

      <div className="flex items-end pb-1 justify-end">
        <div className="text-[11px] font-semibold text-slate-700">{right}</div>
      </div>
    </div>
  );
}

export default function DashboardGanttBoard({ groups = [], meta = null }) {
  const ROW_H = 16;
  const TOP_H = 24;

  const palette = [
    { dot: "bg-indigo-500/80", bar: "bg-indigo-500/70" },
    { dot: "bg-indigo-400/70", bar: "bg-indigo-400/60" },
    { dot: "bg-slate-500/60", bar: "bg-slate-500/55" },
    { dot: "bg-slate-400/60", bar: "bg-slate-400/55" },
  ];

  // ✅ 가운데(공정/작업량) rows
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
    return out.slice(0, 18);
  }, [groups]);

  // ✅ 오른쪽(기계 도넛)
  const machineItems = useMemo(
    () => buildMachineItemsFromGroups(groups, 4),
    [groups],
  );

  const totalMachineMins = useMemo(() => {
    return machineItems.reduce((s, x) => s + (Number(x.value) || 0), 0) || 0;
  }, [machineItems]);

  if (!rowsAll.length) return null;

  return (
    <div className="h-full w-full bg-white flex flex-col min-h-0 overflow-hidden">
      {/* header (1:2:1) */}
      <SectionTitle
        left="시뮬레이션 정보"
        mid="공정 · 작업량"
        right="기계 분포"
        height={TOP_H}
      />

      <div className="shrink-0 h-px bg-slate-100/80" />

      {/* body (1:2:1) */}
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_2fr_1fr] gap-x-3 px-3 py-3">
        {/* (1) 왼쪽: meta */}
        <div className="min-w-0 min-h-0 overflow-hidden">
          <div className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white p-3 overflow-hidden">
            <LeftMeta meta={meta} />
          </div>
        </div>

        {/* (2) 가운데: 공정 + 작업량 (내부 2열) */}
        <div className="min-w-0 min-h-0 overflow-hidden">
          <div className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="h-full min-h-0 grid grid-cols-[38%_62%] gap-x-2 px-2 py-2">
              {/* 공정 */}
              <div className="min-w-0 min-h-0 overflow-auto pr-1">
                <div className="space-y-1">
                  {rowsAll.map((r) => (
                    <div
                      key={r.key}
                      className="group flex items-center gap-1.5 rounded-md px-1.5 hover:bg-slate-50/80"
                      style={{ height: ROW_H }}
                      title={r.label}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          r.dotClass,
                        ].join(" ")}
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
        </div>

        {/* (3) 오른쪽: machine donut */}
        <div className="min-w-0 min-h-0 overflow-hidden">
          <div className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white p-3 overflow-hidden flex flex-col">
            {!machineItems.length ? (
              <div className="h-full grid place-items-center text-[11px] text-slate-500">
                기계 데이터 없음
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 grid place-items-center">
                  <DonutSvg items={machineItems} size={150} thickness={16} />
                </div>

                <div className="shrink-0 pt-2 space-y-1">
                  {machineItems.map((it) => {
                    const dot = (it.colorClass || "text-indigo-500").replace(
                      "text-",
                      "bg-",
                    );

                    const pct =
                      totalMachineMins > 0
                        ? Math.round(
                            (Number(it.value) / totalMachineMins) * 100,
                          )
                        : 0;

                    return (
                      <div
                        key={it.label}
                        className="flex items-center gap-2 text-[11px] text-slate-600"
                        title={it.label}
                      >
                        <span
                          className={["h-2 w-2 rounded-full", dot].join(" ")}
                        />
                        <div className="min-w-0 flex-1 truncate">
                          {it.label}
                        </div>
                        <div className="shrink-0 tabular-nums text-slate-500">
                          {formatMins(it.value)} · {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
