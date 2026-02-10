// src/components/gantt-test/gantt-right-panel-machine.js
"use client";

import React from "react";
import { calcBar } from "./gantt-utils";

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
  scrollLeft,
  rightScrollYRef,
  onRightScrollY,
  rightScrollXRef,
  onRightScrollX,
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* 세로 스크롤(유일) */}
      <div
        ref={rightScrollYRef}
        onScroll={onRightScrollY}
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: bottomScrollHeight }}
      >
        {/* 가로 스크롤(내용) */}
        <div
          ref={rightScrollXRef}
          onScroll={onRightScrollX}
          className="overflow-x-auto overflow-y-hidden"
        >
          <div style={{ width: gridWidthPx, minHeight: 1 }}>
            {(groups || []).map((g, gi) => {
              const isCollapsed = !!collapsed[g.id];
              const tasks = g.tasks || [];

              return (
                <div key={g.id} className="border-b border-slate-200/60">
                  {/* 머신 헤더 높이만큼 오른쪽도 맞춰줌 */}
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

                      return (
                        <div
                          key={t.id}
                          className="relative border-t border-slate-100"
                          style={{ height: rowHeight }}
                        >
                          {/* grid 라인 */}
                          <div className="absolute inset-0 pointer-events-none">
                            {Array.from({
                              length: Math.max(
                                1,
                                Math.floor(gridWidthPx / colWidth),
                              ),
                            }).map((_, i) => (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-slate-100"
                                style={{ left: i * colWidth }}
                              />
                            ))}
                          </div>

                          {/* bar */}
                          <div
                            className={[
                              "absolute top-1/2 -translate-y-1/2",
                              "h-8 rounded-lg shadow-sm",
                              "px-2 flex items-center gap-2",
                              "text-[11px] font-black text-white",
                              pickBarClass?.(gi) || "bg-indigo-500",
                            ].join(" ")}
                            style={{ left, width }}
                            title={`${t.taskId} · ${t.workerName || "-"} · ${t.startAt} ~ ${t.endAt}`}
                          >
                            <span className="truncate">
                              {t.workerName || "-"}
                            </span>
                          </div>
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
