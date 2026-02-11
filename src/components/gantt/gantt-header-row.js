"use client";

import React from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

export default function GanttHeaderRow({
  leftWidth,
  headerHeight,
  gridWidthPx,
  colWidth,
  totalCols,
  ticks,
  rangeStart,
  stepMinutes,
  scrollLeft,
}) {
  return (
    <div className="sticky top-0 z-30">
      {/* ✅ 헤더 박스: 높이 줄이고(작게), 폰트 굵기 낮추고, 라운드/스타일 적용 */}
      <div className="overflow-hidden rounded-t-xl">
        <div className="flex bg-slate-200">
          {/* 왼쪽 헤더 */}
          <div
            className="shrink-0 px-3 flex items-center"
            style={{ width: leftWidth, height: headerHeight }}
          >
            <div className="w-full flex items-center justify-between text-[12px] font-medium text-slate-700">
              <span className="tracking-tight">테이블</span>
              <span className="tracking-tight">시간축</span>
            </div>
          </div>

          {/* 오른쪽 헤더(시간축) */}
          <div
            className="relative flex-1 overflow-hidden"
            style={{ height: headerHeight }}
          >
            <div
              style={{
                width: gridWidthPx,
                height: headerHeight,
                transform: `translateX(${-scrollLeft}px)`,
                willChange: "transform",
              }}
            >
              <div className="flex h-full">
                {Array.from({ length: totalCols }).map((_, i) => {
                  if (!rangeStart) return null;

                  const d =
                    ticks?.[i] ||
                    new Date(
                      rangeStart.getTime() + i * stepMinutes * 60 * 1000,
                    );

                  return (
                    <div
                      key={i}
                      className={[
                        "h-full flex items-center justify-center",
                        "text-[12px] font-medium text-slate-700",

                        "relative",
                      ].join(" ")}
                      style={{ width: colWidth }}
                    >
                      <span className="absolute left-0 top-0 bottom-0 w-px bg-white" />
                      {pad2(d.getHours())}:00
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ✅ 아래쪽 얇은 라인으로 ‘칸’ 느낌 강화 */}
            {/* <div className="absolute inset-x-0 bottom-0 h-px bg-white/70" /> */}
          </div>
        </div>
      </div>
    </div>
  );
}
