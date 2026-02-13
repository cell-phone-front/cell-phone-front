// src/components/gantt-right-panel-machine.js
"use client";

import React from "react";
import { calcBar } from "./gantt-utils";

function toHM(v) {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function GanttRightPanelMachine({
  groups = [],
  collapsed = {},
  pickBarClass,
  gridWidthPx,
  colWidth,
  rowHeight,
  groupHeaderHeight,
  bottomScrollHeight,
  rangeStart,
  stepMinutes,

  rightYRef,
  onRightScrollY,

  rightXRef,
  onRightScrollX,
}) {
  return (
    <div className="flex-1 min-w-0 min-h-0 bg-white">
      {/*  세로 스크롤” */}
      <div
        ref={rightYRef}
        onScroll={onRightScrollY}
        className="h-full min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: bottomScrollHeight }}
      >
        {/*  */}
        <div
          ref={rightXRef}
          onScroll={onRightScrollX}
          className="overflow-x-auto overflow-y-hidden"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* 크롬 스크롤바 숨김 (이 컴포넌트 안 div들에만 적용) */}
          <style jsx>{`
            div::-webkit-scrollbar {
              height: 0px;
            }
          `}</style>

          <div style={{ width: gridWidthPx, minHeight: 1 }}>
            {(groups || []).map((g, gi) => {
              const isCollapsed = !!collapsed[g.id];
              const tasks = g.tasks || [];

              return (
                <div key={g.id} className="border-b border-slate-200/60">
                  {/* 머신 헤더 높이 맞춤 */}
                  <div
                    className="bg-white"
                    style={{ height: groupHeaderHeight }}
                  />

                  {/* 태스크 rows */}
                  {!isCollapsed &&
                    tasks.map((t) => {
                      const { left, width } = calcBar({
                        task: t,
                        rangeStart,
                        stepMinutes,
                        colWidth,
                        gridWidthPx,
                      });

                      const startHM = toHM(t.startAt);
                      const endHM = toHM(t.endAt);

                      return (
                        <div
                          key={t.id}
                          className="relative border-t border-slate-100"
                          style={{ height: rowHeight }}
                        >
                          {/* 바 */}
                          {width > 0 && (
                            <div
                              className={[
                                "group", // ✅ hover 그룹
                                "absolute top-1/2 -translate-y-1/2",
                                "h-10 rounded-xl shadow-md",
                                pickBarClass?.(gi) || "bg-indigo-500",
                              ].join(" ")}
                              style={{ left, width }}
                              title={[
                                t.taskId,
                                t.workerName,
                                startHM && endHM ? `${startHM}~${endHM}` : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")} // ✅ 브라우저 기본 툴팁(백업)
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

                                {startHM && endHM && (
                                  <span className="ml-auto text-[11px] text-white/70 font-medium whitespace-nowrap">
                                    {startHM}~{endHM}
                                  </span>
                                )}
                              </div>

                              {/* ✅ Hover Tooltip: 바에 갖다대면 전체 텍스트 표시 */}
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
                                    (t.workerName ? ` · ${t.workerName}` : "")}
                                </div>
                                {startHM && endHM ? (
                                  <div className="mt-0.5 text-[11px] text-slate-500 whitespace-nowrap">
                                    {startHM} ~ {endHM}
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
        </div>
      </div>
    </div>
  );
}
