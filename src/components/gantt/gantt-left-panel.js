// src/components/gantt/gantt-left-panel.js
"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GanttLeftPanel({
  groups,
  collapsed,
  toggleGroup,

  opCollapsed,
  toggleOperation,

  leftWidth,
  groupHeaderHeight,
  rowHeight,

  leftScrollRef,
  onLeftScrollY,

  bottomScrollHeight,
}) {
  const groupTint = [
    "border-l-[#86DCF0]",
    "border-l-[#869AF0]",
    "border-l-[#85BAEF]",
    "border-l-[#34F7DC]",
  ];

  return (
    <div
      className="shrink-0 bg-white border-r border-slate-200/80 flex flex-col"
      style={{ width: leftWidth }}
    >
      <div
        ref={leftScrollRef}
        onScroll={onLeftScrollY}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {(groups || []).map((g, gi) => {
          const isGroupCollapsed = !!collapsed[g.id];
          const opCount = (g.operations || []).length;

          return (
            <div key={g.id} className="border-b border-slate-200/60">
              {/* ✅ product 그룹 헤더 */}
              <div
                style={{ height: groupHeaderHeight }}
                className={[
                  "group relative flex items-center bg-white",
                  "border-t border-slate-200/60",
                  "border-l-[5px]",
                  groupTint[gi % 4],
                ].join(" ")}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-slate-50/60 transition-opacity" />

                <div className="relative w-full px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroup(g.id)}
                    className="w-full rounded-none px-2 h-full justify-start hover:bg-transparent"
                  >
                    <span className="font-extrabold truncate min-w-0 flex-1 text-left text-slate-900">
                      {g.title}
                    </span>

                    <span className="ml-2 flex items-center gap-2 shrink-0">
                      <Badge className="h-6 px-2 text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                        {opCount}
                      </Badge>

                      {isGroupCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </span>
                  </Button>
                </div>
              </div>

              {/* ✅ operation 리스트 */}
              {!isGroupCollapsed &&
                (g.operations || []).map((op) => {
                  const isOpCollapsed = opCollapsed?.[op.id] ?? true;
                  const planner = op.plannerName || "";

                  return (
                    <div key={op.id} className="border-t border-slate-200/50">
                      {/* operation row */}
                      <button
                        type="button"
                        onClick={() => toggleOperation(op.id)}
                        className={[
                          "w-full flex items-center gap-2 px-3",
                          "hover:bg-slate-50/70 transition-colors",
                        ].join(" ")}
                        style={{ height: rowHeight }}
                        title={op.operationId}
                      >
                        {isOpCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                        )}

                        <div className="min-w-0">
                          {/* OP ID */}
                          <div className="truncate text-[13px] font-semibold text-slate-800">
                            {op.operationId}
                          </div>

                          {/* Planner (아래줄) */}
                          {planner && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {planner}
                            </div>
                          )}
                        </div>

                        <Badge className="h-6 px-2 text-[11px] bg-white text-slate-600 border border-slate-200">
                          {(op.tasks || []).length}
                        </Badge>
                      </button>

                      {/* task rows (operation 펼치면) */}
                      {!isOpCollapsed &&
                        (op.tasks || []).map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center px-8 border-t border-slate-100 hover:bg-blue-50/40 transition-colors"
                            style={{ height: rowHeight }}
                            title={t.taskId}
                          >
                            <div className="min-w-0">
                              {/* TASK ID */}
                              <div className="truncate text-[12.5px] font-semibold text-slate-700">
                                {t.taskId}
                              </div>

                              {/* Worker (아래줄) */}
                              {t.workerName && (
                                <div className="text-[11px] text-slate-500 truncate">
                                  {t.workerName}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      <div
        className="border-t border-slate-200/70 bg-white shrink-0"
        style={{ height: bottomScrollHeight }}
      />
    </div>
  );
}
