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
}) {
  /* 그룹 컬러 바 */
  const groupTint = [
    "border-l-[#86DCF0]",
    "border-l-[#869AF0]",
    "border-l-[#85BAEF]",
    "border-l-[#34F7DC]",
  ];

  return (
    <div
      className="
        shrink-0 bg-white
        border-r border-slate-200/80
        flex flex-col
      "
      style={{ width: leftWidth }}
    >
      {(groups || []).map((g, gi) => {
        const isGroupCollapsed = !!collapsed?.[g.id];
        const opCount = (g.operations || []).length;

        return (
          <div key={g.id}>
            {/* ================== PRODUCT ================== */}
            <div
              style={{ height: groupHeaderHeight }}
              className={[
                "relative bg-white",
                "border-b border-slate-200/70",
                "border-l-[6px]",
                groupTint[gi % 4],
              ].join(" ")}
            >
              {/* hover layer */}
              <div className="absolute inset-0 bg-slate-50/60 opacity-0 hover:opacity-100 transition" />

              <div className="relative h-full w-full px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(g.id)}
                  className="
                    w-full h-full
                    rounded-none
                    px-2
                    justify-start
                    hover:bg-transparent
                  "
                >
                  <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-slate-900 text-left">
                    {g.title}
                  </span>

                  <span className="ml-2 flex items-center gap-2 shrink-0">
                    <Badge
                      className="
                        h-6 px-2
                        text-[11px]
                        bg-slate-100
                        text-slate-700
                        border border-slate-200
                        font-medium
                      "
                    >
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

            {/* ================== OPERATIONS ================== */}
            {!isGroupCollapsed &&
              (g.operations || []).map((op) => {
                const isOpCollapsed = opCollapsed?.[op.id] ?? false;

                const planner = op.plannerName || "";
                const opLabel = String(
                  op.operationName || op.name || op.operationId || op.id || "",
                );

                return (
                  <div key={op.id}>
                    {/* OP ROW */}
                    <div
                      className="w-full border-b border-slate-200"
                      style={{ height: rowHeight }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleOperation(op.id)}
                        className="w-full h-full hover:bg-indigo-50/40 transition-colors"
                        title={opLabel}
                      >
                        <div className="h-full px-3 flex items-center gap-2">
                          {/* icon */}
                          {isOpCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                          )}

                          {/* text */}
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="truncate text-[13px] font-medium text-slate-800">
                              {opLabel}
                            </div>

                            {planner && (
                              <div className="truncate text-[11px] text-slate-500">
                                {planner}
                              </div>
                            )}
                          </div>

                          {/* count */}
                          <Badge
                            className="
                              h-6 px-2
                              text-[11px]
                              bg-white
                              text-slate-600
                              border border-slate-200
                              font-medium
                            "
                          >
                            {(op.tasks || []).length}
                          </Badge>
                        </div>
                      </button>
                    </div>

                    {/* ================== TASKS ================== */}
                    {!isOpCollapsed &&
                      (op.tasks || []).map((t, ti) => {
                        const taskIdOnly = String(
                          t.taskId || t.id || t.raw?.taskId || "",
                        );

                        return (
                          <div
                            key={String(t.id || `${op.id}_${taskIdOnly}_${ti}`)}
                            className="
                              w-full
                              border-b border-slate-100
                              hover:bg-blue-50/30
                              transition-colors
                            "
                            style={{ height: rowHeight }}
                            title={taskIdOnly}
                          >
                            <div className="h-full px-4 flex items-center justify-end">
                              <div className="min-w-0 text-right leading-tight">
                                <div className="truncate text-[12.5px] font-medium text-slate-700">
                                  {taskIdOnly || "-"}
                                </div>

                                {t.workerName && (
                                  <div className="truncate text-[11px] text-slate-500">
                                    {t.workerName}
                                  </div>
                                )}
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
  );
}
