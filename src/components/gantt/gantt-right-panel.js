// src/components/gantt-test/gantt-right-panel.js
import React from "react";
import { fmtHM, calcBar as calcBarUtil } from "./gantt-utils";

export default function GanttRightPanel({
  groups,
  collapsed,
  pickBarClass,

  // layout
  gridWidthPx,
  totalCols,
  colWidth,
  rowHeight,
  groupHeaderHeight,
  bottomScrollHeight,

  // range
  rangeStart,
  stepMinutes,

  // now line
  showNow,
  nowLeftPx,

  // scroll
  scrollLeft,
  rightScrollYRef,
  onRightScrollY,
  rightScrollXRef,
  onRightScrollX,
}) {
  const barHeight = Math.min(44, rowHeight - 16);
  const barTop = Math.floor((rowHeight - barHeight) / 2) - 1;

  return (
    <div className="relative flex-1 min-w-0 overflow-hidden bg-background">
      <div
        ref={rightScrollYRef}
        onScroll={onRightScrollY}
        className={[
          "min-h-0 overflow-y-auto overflow-x-hidden",
          "[&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0",
          "[scrollbar-width:none] [-ms-overflow-style:none]",
          "min-h-0 overflow-y-auto overflow-x-hidden",
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
          {/* 배경: 세로줄/세로띠만 */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex">
              {Array.from({ length: totalCols }).map((_, i) => (
                <div
                  key={i}
                  style={{ width: colWidth }}
                  className={[
                    "h-full border-l border-border/60",
                    i % 2 === 0 ? "bg-sky-500/5" : "bg-transparent",
                  ].join(" ")}
                />
              ))}
            </div>

            {/* {showNow && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-foreground/35"
                style={{ left: nowLeftPx }}
              />
            )} */}
          </div>

          {/* ROWS (가로줄 없음) */}
          <div className="relative">
            {groups.map((g, gi) => {
              const isCollapsed = !!collapsed[g.id];
              const barClass = pickBarClass(gi);

              return (
                <div key={`${g.id}-${gi}`} className="">
                  {/* 그룹 헤더 공간 (줄 없음) */}
                  <div
                    className="bg-muted/10"
                    style={{ height: groupHeaderHeight }}
                  />

                  {!isCollapsed &&
                    g.tasks.map((t) => {
                      const { left, width } = calcBarUtil({
                        task: t,
                        rangeStart,
                        stepMinutes,
                        colWidth,
                      });

                      return (
                        <div
                          key={`${g.id}-${t.id}-${gi}`}
                          className="relative border-t border-border/35"
                          style={{ height: rowHeight }}
                        >
                          {/* hover */}
                          <div className="absolute inset-0 hover:bg-muted/10 transition-colors" />

                          {/* 간트 그래프 bar */}
                          <div
                            className={[
                              "absolute border shadow-sm flex items-center rounded-sm",
                              "transition-shadow hover:shadow-md",
                              "px-3 py-4 leading-tight",
                              barClass,
                            ].join(" ")}
                            style={{
                              left,
                              width,
                              top: 10,
                              height: rowHeight - 20,
                            }}
                            title={`${g.title} / ${t.name}\n${fmtHM(
                              t.startAt,
                            )} ~ ${fmtHM(t.endAt)}`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">
                                {t.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
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
        </div>
      </div>

      {/* 아래: 가로 스크롤바 전용 */}
      <div
        className="border-t border-border/40 bg-background"
        style={{ height: bottomScrollHeight }}
      >
        <div
          ref={rightScrollXRef}
          onScroll={onRightScrollX}
          className="h-full overflow-x-scroll overflow-y-hidden"
          style={{ scrollbarGutter: "stable" }} // 크롬에서 스크롤 영역 안정화(옵션)
        >
          <div style={{ width: gridWidthPx, height: bottomScrollHeight }} />
        </div>
      </div>
    </div>
  );
}
