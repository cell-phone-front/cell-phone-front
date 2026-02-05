// src/components/gantt/gantt-right-panel.js
"use client";

import React from "react";
import { fmtHM, calcBar as calcBarUtil } from "./gantt-utils";

export default function GanttRightPanel({
  groups,
  collapsed,
  opCollapsed,

  pickBarClass,

  gridWidthPx,
  totalCols,
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
    <div className="relative flex-1 min-w-0 overflow-hidden bg-white">
      <div
        ref={rightScrollYRef}
        onScroll={onRightScrollY}
        className={[
          "min-h-0 overflow-y-auto overflow-x-hidden",
          "[&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0",
          "[scrollbar-width:none] [-ms-overflow-style:none]",
        ].join(" ")}
        style={{ height: `calc(100% - ${bottomScrollHeight}px)` }}
      >
        <div
          className="relative"
          style={{
            width: gridWidthPx,
            transform: `translateX(${-scrollLeft}px)`,
            willChange: "transform",
          }}
        >
          {/* 배경: 시간축 세로줄 + 세로띠 */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex">
              {Array.from({ length: totalCols }).map((_, i) => (
                <div
                  key={i}
                  style={{ width: colWidth }}
                  className={[
                    "h-full border-l border-slate-200/60",
                    i % 2 === 0 ? "bg-slate-50/70" : "bg-transparent",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>

          <div className="relative">
            {(groups || []).map((g, gi) => {
              const isGroupCollapsed = !!collapsed[g.id];
              const barClass = pickBarClass(gi);

              return (
                <div key={g.id}>
                  {/* ✅ product 그룹 헤더 공간 */}
                  <div style={{ height: groupHeaderHeight }} />

                  {!isGroupCollapsed &&
                    (g.operations || []).map((op) => {
                      const isOpCollapsed = opCollapsed?.[op.id] ?? true;

                      return (
                        <div key={op.id}>
                          {/* ✅ operation row 높이(좌측과 맞춤) : 바 없음 */}
                          <div
                            className="relative border-t border-slate-200/60"
                            style={{ height: rowHeight }}
                          >
                            <div className="absolute inset-0 hover:bg-slate-50/50 transition-colors" />
                          </div>

                          {/* ✅ operation 펼쳤을 때 task rows 렌더 + 바 표시 */}
                          {!isOpCollapsed &&
                            (op.tasks || []).map((t) => {
                              const { left, width } = calcBarUtil({
                                task: t,
                                rangeStart,
                                stepMinutes,
                                colWidth,
                              });

                              return (
                                <div
                                  key={t.id}
                                  className="relative border-t border-slate-100"
                                  style={{ height: rowHeight }}
                                >
                                  <div className="absolute inset-0 hover:bg-blue-50/60 transition-colors" />

                                  <div
                                    className={[
                                      "absolute rounded-md shadow-sm",
                                      "px-3 py-2 flex items-center",
                                      "text-slate-900",
                                      barClass,
                                      "hover:brightness-[1.03] transition",
                                    ].join(" ")}
                                    style={{
                                      left,
                                      width,
                                      top: 6,
                                      height: rowHeight - 12,
                                    }}
                                    title={[
                                      `${g.title}`,
                                      `OP: ${op.operationId} (${op.plannerName || "-"})`,
                                      `TASK: ${t.taskId} (${t.workerName || "-"})`,
                                      `${fmtHM(t.startAt)} ~ ${fmtHM(t.endAt)}`,
                                    ].join("\n")}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-[12px] font-extrabold truncate">
                                        {t.taskId}
                                        {t.workerName ? (
                                          <span className="ml-2 text-[11px] font-medium text-slate-700/80">
                                            {t.workerName}
                                          </span>
                                        ) : null}
                                      </div>
                                      <div className="text-[11px] font-semibold text-slate-700 truncate">
                                        {fmtHM(t.startAt)} ~ {fmtHM(t.endAt)}
                                      </div>
                                    </div>
                                  </div>
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

      {/* 아래: 가로 스크롤 */}
      <div
        className="border-t border-slate-200/80 bg-white"
        style={{ height: bottomScrollHeight }}
      >
        <div
          ref={rightScrollXRef}
          onScroll={onRightScrollX}
          className="h-full overflow-x-scroll overflow-y-hidden"
          style={{ scrollbarGutter: "stable" }}
        >
          <div style={{ width: gridWidthPx, height: bottomScrollHeight }} />
        </div>
      </div>
    </div>
  );
}
