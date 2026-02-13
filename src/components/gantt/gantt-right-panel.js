"use client";

import React from "react";
import { toMs } from "./gantt-utils";

function fmtHM(v) {
  const ms = toMs(v);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function GanttRightPanel({
  groups,
  collapsed,
  opCollapsed,
  pickBarClass,
  gridWidthPx,
  colWidth,
  rowHeight,
  groupHeaderHeight,
  rangeStart,
  stepMinutes,

  // ✅ 추가: 외부(스크롤호스트)에서 전달
  scrollLeft = 0,
}) {
  const pxPerMinute = colWidth / stepMinutes;

  const calcLeftWidth = (startAt, endAt) => {
    const s = toMs(startAt);
    const e = toMs(endAt);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s)
      return { left: 0, width: 0 };

    const base = rangeStart.getTime();
    const leftMin = (s - base) / 60000;
    const durMin = (e - s) / 60000;

    const rawLeft = leftMin * pxPerMinute;
    const rawWidth = durMin * pxPerMinute;

    const visLeft = Math.max(0, rawLeft);
    const visRight = Math.min(gridWidthPx, rawLeft + rawWidth);
    const visWidth = Math.max(0, visRight - visLeft);

    return visWidth <= 0
      ? { left: 0, width: 0 }
      : { left: visLeft, width: Math.max(4, visWidth) };
  };

  const sortTasks = (tasks) => {
    return [...(tasks || [])].sort((a, b) => {
      const as = toMs(a?.startAt);
      const bs = toMs(b?.startAt);
      if (Number.isFinite(as) && Number.isFinite(bs) && as !== bs)
        return as - bs;
      return String(a?.taskId || "").localeCompare(String(b?.taskId || ""));
    });
  };

  return (
    <div className="flex-1 min-w-0 bg-white">
      {/* ✅ RightPanel은 스크롤을 가지지 않습니다 */}
      <div className="min-w-0 overflow-x-hidden overflow-y-hidden">
        {/* ✅ 가로 이동은 scrollLeft로 translate */}
        <div
          className="relative"
          style={{
            width: gridWidthPx,
            minWidth: gridWidthPx,
            transform: `translateX(${-scrollLeft}px)`,
            willChange: "transform",
          }}
        >
          {(groups || []).map((g, gi) => {
            const isGroupCollapsed = !!collapsed?.[g.id];

            return (
              <div key={g.id}>
                <div
                  className="border-b border-slate-200"
                  style={{ height: groupHeaderHeight }}
                />

                {isGroupCollapsed
                  ? null
                  : (g.operations || []).map((op) => {
                      const isOpCollapsed = opCollapsed?.[op.id] ?? false;

                      return (
                        <div key={op.id}>
                          <div
                            className="border-b border-slate-200"
                            style={{ height: rowHeight }}
                          />

                          {isOpCollapsed
                            ? null
                            : sortTasks(op.tasks).map((t, ti) => {
                                const { left, width } = calcLeftWidth(
                                  t.startAt,
                                  t.endAt,
                                );

                                return (
                                  <div
                                    key={ti}
                                    className="relative border-b border-slate-100"
                                    style={{ height: rowHeight }}
                                  >
                                    {width > 0 && (
                                      <div
                                        className={[
                                          "group", // ✅ hover 그룹
                                          "absolute top-1/2 -translate-y-1/2",
                                          "h-10 rounded-xl shadow-md",
                                          pickBarClass(gi),
                                        ].join(" ")}
                                        style={{ left, width }}
                                        title={[
                                          t.taskId || "-",
                                          t.workerName
                                            ? `· ${t.workerName}`
                                            : null,
                                          fmtHM(t.startAt) && fmtHM(t.endAt)
                                            ? `· ${fmtHM(t.startAt)}~${fmtHM(t.endAt)}`
                                            : null,
                                        ]
                                          .filter(Boolean)
                                          .join(" ")} // ✅ 기본 브라우저 툴팁(백업)
                                      >
                                        <div className="h-full w-full px-3 flex items-center gap-3 overflow-hidden">
                                          <span className="text-[12.5px] font-semibold text-white whitespace-nowrap">
                                            {t.taskId || "-"}
                                          </span>

                                          {t.workerName && (
                                            <span className="text-[11px] text-white/80 whitespace-nowrap">
                                              {t.workerName}
                                            </span>
                                          )}

                                          {fmtHM(t.startAt) &&
                                            fmtHM(t.endAt) && (
                                              <span className="ml-auto text-[11px] text-white/70 font-medium whitespace-nowrap">
                                                {fmtHM(t.startAt)}~
                                                {fmtHM(t.endAt)}
                                              </span>
                                            )}
                                        </div>

                                        {/* ✅ hover 시 전체 텍스트 툴팁 */}
                                        <div
                                          className={[
                                            "pointer-events-none",
                                            "absolute z-50",
                                            "left-2 top-1/2 -translate-y-1/2",
                                            "hidden group-hover:block",
                                            "max-w-[520px]",
                                            "rounded-xl border border-slate-200",
                                            "bg-white px-3 py-2 shadow-lg",
                                          ].join(" ")}
                                        >
                                          <div className="text-[12px] font-semibold text-slate-900 whitespace-nowrap">
                                            {(t.taskId || "-") +
                                              (t.workerName
                                                ? ` · ${t.workerName}`
                                                : "")}
                                          </div>
                                          {fmtHM(t.startAt) &&
                                          fmtHM(t.endAt) ? (
                                            <div className="mt-0.5 text-[11px] text-slate-500 whitespace-nowrap">
                                              {fmtHM(t.startAt)} ~{" "}
                                              {fmtHM(t.endAt)}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                        </div>
                      );
                    })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
