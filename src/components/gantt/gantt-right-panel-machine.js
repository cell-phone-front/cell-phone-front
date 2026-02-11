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

  rightYRef,
  onRightScrollY,

  rightXRef,
  onRightScrollX,
}) {
  const vLineCount = Math.floor(gridWidthPx / colWidth) + 1;

  return (
    <div className="flex-1 min-w-0 min-h-0 bg-white">
      {/* ✅ 오른쪽이 “세로 스크롤 유일” */}
      <div
        ref={rightYRef}
        onScroll={onRightScrollY}
        className="h-full min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: bottomScrollHeight }}
      >
        {/* ✅ 내부 가로 이동은 가능하지만, 스크롤바는 숨김 */}
        <div
          ref={rightXRef}
          onScroll={onRightScrollX}
          className="overflow-x-auto overflow-y-hidden"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* 크롬 스크롤바 숨김 */}
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

                      return (
                        <div
                          key={t.id}
                          className="relative border-t border-slate-100"
                          style={{ height: rowHeight }}
                        >
                          {/* grid 세로선 */}
                          {Array.from({ length: vLineCount }).map((_, i) => (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 w-px bg-slate-100"
                              style={{ left: i * colWidth }}
                            />
                          ))}

                          {/* bar */}
                          <div
                            className={[
                              "absolute top-1/2 -translate-y-1/2",
                              "h-8 rounded-lg shadow-sm",
                              "px-2 flex items-center gap-2",
                              "text-[11px] font-semibold text-white",
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
