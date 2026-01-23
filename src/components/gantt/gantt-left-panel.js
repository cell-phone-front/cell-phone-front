// src/components/gantt-test/gantt-left-panel.js

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GanttLeftPanel({
  groups,
  collapsed,
  toggleGroup,

  leftWidth,
  groupHeaderHeight,
  rowHeight,

  leftScrollRef,
  onLeftScrollY,

  bottomScrollHeight,
}) {
  const groupTint = [
    "border-l-[#86DCF0]",
    "border-l-[#869AF0] ",
    "border-l-[#85BAEF] ",
    "border-l-[#34F7DC]",
  ];

  return (
    <div
      className="shrink-0 bg-background border-r border-border/55 flex flex-col"
      style={{ width: leftWidth }}
    >
      {/* 스크롤 영역 */}
      <div
        ref={leftScrollRef}
        onScroll={onLeftScrollY}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {groups.map((g, gi) => {
          const isCollapsed = !!collapsed[g.id];

          return (
            <div key={g.id} className="border-b border-border/15">
              <div
                style={{ height: groupHeaderHeight }}
                className={[
                  "group relative flex items-center",
                  "border-t border-border/20",
                  "border-l-[5px]",
                  groupTint[gi % 4],
                ].join(" ")}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-muted/20 transition-opacity" />

                <div className="relative w-full px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroup(g.id)}
                    className="w-full rounded-none px-1"
                  >
                    {/* 왼쪽: 타이틀 */}
                    <span className="font-semibold truncate min-w-0 flex-1 text-left">
                      {g.title}
                    </span>

                    {/* 오른쪽: (숫자 + 화살표) 한 덩어리 */}
                    <span className="ml-2 flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{g.tasks.length}</Badge>

                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                  </Button>
                </div>
              </div>

              {!isCollapsed &&
                g.tasks.map((t) => (
                  <div
                    key={`${g.id}-${t.id}`}
                    className="relative flex items-center border-t border-border/35 hover:bg-muted/20 transition-colors"
                    style={{ height: rowHeight }}
                  >
                    <div className="min-w-0 w-full px-3">
                      <div className="text-sm truncate">{t.name}</div>
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {/* 하단 빈 공간 (오른쪽 가로 스크롤바 높이 맞춤) */}
      <div
        className="border-t border-border/40 bg-background shrink-0"
        style={{ height: bottomScrollHeight }}
      />
    </div>
  );
}
