// src/components/gantt-test/gantt-left-panel.js
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
      className="shrink-0 bg-white border-r border-slate-200/80 flex flex-col min-h-0"
      style={{ width: leftWidth }}
    >
      {/* ✅ 스크롤바는 안 보이게(overflow-hidden), 다만 scrollTop 동기화는 ref로 적용됨 */}
      <div
        ref={leftScrollRef}
        className="flex-1 min-h-0 overflow-hidden"
        style={{ paddingBottom: bottomScrollHeight }}
      >
        {(groups || []).map((g, gi) => {
          const isGroupCollapsed = !!collapsed?.[g.id];
          const opCount = (g.operations || []).length;

          return (
            <div key={g.id} className="border-b border-slate-200/60">
              {/* product header */}
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

              {/* operations */}
              {!isGroupCollapsed &&
                (g.operations || []).map((op) => {
                  const isOpCollapsed = opCollapsed?.[op.id] ?? false;
                  const planner = op.plannerName || "";

                  const opLabel = String(
                    op.operationName ||
                      op.name ||
                      op.operationId ||
                      op.id ||
                      "",
                  );

                  return (
                    <div key={op.id} className="border-t border-slate-200/50">
                      {/* operation row */}
                      <button
                        type="button"
                        onClick={() => toggleOperation(op.id)}
                        className="w-full flex items-center gap-2 px-3 hover:bg-slate-50/70 transition-colors"
                        style={{ height: rowHeight }}
                        title={String(op.operationId || opLabel)}
                      >
                        {isOpCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-slate-800">
                            {opLabel}
                          </div>

                          {/* ✅ plannerName 작게 */}
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

                      {/* task rows */}
                      {!isOpCollapsed &&
                        (op.tasks || []).map((t) => {
                          const taskIdOnly = String(
                            t.taskId || t.id || t.raw?.taskId || "",
                          );

                          return (
                            <div
                              key={String(t.id || `${op.id}__${taskIdOnly}`)}
                              className="flex items-center px-8 border-t border-slate-100 hover:bg-blue-50/40 transition-colors"
                              style={{ height: rowHeight }}
                              title={taskIdOnly}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[12.5px] font-semibold text-slate-700">
                                  {taskIdOnly || "-"}
                                </div>

                                {/* ✅ workerName 작게 */}
                                {t.workerName && (
                                  <div className="text-[11px] text-slate-500 truncate">
                                    {t.workerName}
                                  </div>
                                )}
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
  );
}
