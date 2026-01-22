// src/components/gantt-test/gantt-header-row.js
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { pad2 } from "./gantt-utils";

export default function GanttHeaderRow({
  leftWidth,
  headerHeight,
  gridWidthPx,
  colWidth,
  totalCols,
  ticks,
  rangeStart,
  stepMinutes,
  activeTab,
  setActiveTab,
  scrollLeft,
}) {
  return (
    <div className="flex border-b border-border/60 bg-muted/20">
      {/* 왼쪽 헤더(탭) */}
      <div
        className="shrink-0 px-2 flex items-center gap-2"
        style={{ width: leftWidth, height: headerHeight }}
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={[
              "mb-1 h-7 px-10 rounded-md transition-colors font-medium",
              activeTab === "work"
                ? "bg-gray-800 text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700",
            ].join(" ")}
            onClick={() => setActiveTab("work")}
          >
            작업
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={[
              "mb-1 h-7 px-12 rounded-md transition-colors font-medium",
              activeTab === "tool"
                ? "bg-gray-800 text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700",
            ].join(" ")}
            onClick={() => setActiveTab("tool")}
          >
            툴
          </Button>
        </div>
      </div>

      {/* 오른쪽 헤더(시간축) */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ height: headerHeight }}
      >
        {/*  스크롤값에 맞춰서 시간축도 같이 움직이게 */}
        <div
          className="will-change-transform"
          style={{
            width: gridWidthPx,
            height: headerHeight,
            transform: `translateX(${-scrollLeft}px)`,
          }}
        >
          <div className="flex h-full">
            {Array.from({ length: totalCols }).map((_, i) => {
              const d =
                ticks[i] ||
                new Date(rangeStart.getTime() + i * stepMinutes * 60 * 1000);

              return (
                <div
                  key={i}
                  className="h-full flex items-center justify-center text-[12.3px] leading-none text-muted-foreground border-l border-border/50"
                  style={{ width: colWidth }}
                >
                  {pad2(d.getHours())}:00
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
