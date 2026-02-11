// src/components/gantt-test/gantt-left-panel-machine.js
"use client";

import React from "react";

export default function GanttLeftPanelMachine({
  groups = [],
  collapsed = {},
  toggleGroup,
  leftWidth,
  groupHeaderHeight,
  rowHeight,
  leftYRef,
}) {
  return (
    <div
      className="shrink-0 border-r border-slate-200/80 bg-white"
      style={{ width: leftWidth }}
    >
      {/* ✅ 왼쪽은 스크롤 “표시/조작” 안 함(overflow-hidden)
          ✅ 단, scrollTop 동기화를 위해 ref만 붙여둠 */}
      <div ref={leftYRef} className="h-full overflow-hidden">
        {(groups || []).map((g) => {
          const isCollapsed = !!collapsed[g.id];
          const tasks = g.tasks || [];

          return (
            <div key={g.id} className="border-b border-slate-200/60">
              {/* 머신 헤더 */}
              <button
                type="button"
                onClick={() => toggleGroup?.(g.id)}
                className="w-full text-left px-3 flex items-center justify-between hover:bg-slate-50"
                style={{ height: groupHeaderHeight }}
                title={g.title}
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800 truncate">
                    {g.machineId}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {g.machineName || ""}
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 shrink-0">
                  {isCollapsed ? `+${tasks.length}` : tasks.length}
                </div>
              </button>

              {/* 태스크 rows */}
              {!isCollapsed && (
                <div>
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="px-3 flex items-center justify-center border-t border-slate-100"
                      style={{ height: rowHeight }}
                      title={`${t.taskId} · ${t.taskName || ""}`}
                    >
                      <div className="min-w-0 text-center flex flex-col items-center">
                        <div className="text-[12px] font-medium text-slate-800 truncate">
                          {t.taskId}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {t.taskName || "-"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
