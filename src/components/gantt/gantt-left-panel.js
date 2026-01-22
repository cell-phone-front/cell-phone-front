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
}) {
  const groupTint = [
    "border-l-blue-500/50",
    "border-l-amber-500/50",
    "border-l-emerald-500/50",
    "border-l-violet-500/50",
  ];

  return (
    <div
      ref={leftScrollRef}
      onScroll={onLeftScrollY}
      className="shrink-0 bg-background border-r border-border/55 overflow-y-auto"
      style={{ width: leftWidth }}
    >
      {groups.map((g, gi) => {
        const isCollapsed = !!collapsed[g.id];

        return (
          <div key={g.id} className="border-b border-border/15">
            {/* ✅ GROUP HEADER */}
            <div
              style={{ height: groupHeaderHeight }}
              className={[
                "group relative flex items-center",
                "border-t border-border/60",
                "border-l-[5px]",
                groupTint[gi % 4],
              ].join(" ")}
            >
              {/*  hover 배경(줄 전체) */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-muted/20 transition-opacity" />

              {/* 내용은 위로 */}
              <div className="relative w-full px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(g.id)}
                  className="w-full justify-between rounded-none px-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold truncate">{g.title}</span>
                    <Badge variant="secondary" className="ml-2">
                      {g.tasks.length}
                    </Badge>
                  </span>

                  <span
                    className={[
                      "h-1.5 w-10 rounded-full",
                      gi % 4 === 0
                        ? "bg-blue-500/35"
                        : gi % 4 === 1
                        ? "bg-amber-500/35"
                        : gi % 4 === 2
                        ? "bg-emerald-500/35"
                        : "bg-violet-500/35",
                    ].join(" ")}
                    aria-hidden
                  />
                </Button>
              </div>
            </div>

            {/* ✅ TASK ROWS */}
            {!isCollapsed &&
              g.tasks.map((t) => (
                <div
                  key={`${g.id}-${t.id}`}
                  className="relative flex items-center border-t border-border/60 hover:bg-muted/20 transition-colors"
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
  );
}
