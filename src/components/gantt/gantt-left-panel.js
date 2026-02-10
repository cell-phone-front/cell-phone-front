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
      {(groups || []).map((g, gi) => {
        const isGroupCollapsed = !!collapsed?.[g.id];
        const opCount = (g.operations || []).length;

        return (
          <div key={g.id} className="border-b border-slate-200/60">
            {/* ✅ product header: 아래선만 풀폭 */}
            <div
              style={{ height: groupHeaderHeight }}
              className={[
                "relative bg-white",
                "border-b border-slate-200/70", // ✅ 여기!
                "border-l-[6px]",
                groupTint[gi % 4],
              ].join(" ")}
            >
              <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-slate-50/70 transition-opacity" />

              <div className="relative h-full w-full px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(g.id)}
                  className="w-full rounded-none px-2 h-full justify-start hover:bg-transparent"
                >
                  <span className="font-semibold truncate min-w-0 flex-1 text-left text-slate-900">
                    {g.title}
                  </span>

                  <span className="ml-2 flex items-center gap-2 shrink-0">
                    <Badge className="h-6 px-2 text-[11px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
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
                  op.operationName || op.name || op.operationId || op.id || "",
                );

                return (
                  <div key={op.id}>
                    {/* ✅ operation row: 보더는 바깥(w-full)에 */}
                    <div className="w-full border-b border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => toggleOperation(op.id)}
                        className="w-full hover:bg-slate-50/70 transition-colors"
                        style={{ height: rowHeight }}
                        title={String(op.operationId || opLabel)}
                      >
                        {/* ✅ padding은 안쪽 wrapper로 */}
                        <div className="h-full px-3 flex items-center gap-2">
                          {isOpCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-slate-800">
                              {opLabel}
                            </div>
                            {planner ? (
                              <div className="text-[11px] text-slate-500 truncate font-normal">
                                {planner}
                              </div>
                            ) : null}
                          </div>

                          <Badge className="h-6 px-2 text-[11px] bg-white text-slate-600 border border-slate-200 font-medium">
                            {(op.tasks || []).length}
                          </Badge>
                        </div>
                      </button>
                    </div>

                    {/* task rows */}
                    {!isOpCollapsed &&
                      (op.tasks || []).map((t, ti) => {
                        const taskIdOnly = String(
                          t.taskId || t.id || t.raw?.taskId || "",
                        );

                        return (
                          // ✅ task row도 동일: 보더는 바깥(w-full)에
                          <div
                            key={String(
                              t.id || `${op.id}__${taskIdOnly}__${ti}`,
                            )}
                            className="w-full border-b border-slate-100 hover:bg-blue-50/30 transition-colors"
                            style={{ height: rowHeight }}
                            title={taskIdOnly}
                          >
                            {/* ✅ padding은 안쪽 */}
                            <div className="h-full px-4 flex items-center justify-end">
                              <div className="min-w-0 text-right">
                                <div className="truncate text-[12.5px] font-medium text-slate-700">
                                  {taskIdOnly || "-"}
                                </div>
                                {t.workerName ? (
                                  <div className="text-[11px] text-slate-500 truncate font-normal">
                                    {t.workerName}
                                  </div>
                                ) : null}
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
