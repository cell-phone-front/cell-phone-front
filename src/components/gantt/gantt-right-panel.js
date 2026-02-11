"use client";

import React from "react";
import { toMs } from "./gantt-utils";

function fmtHM(v) {
  const ms = toMs(v);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function GanttRightPanel({
  groups,
  collapsed,
  opCollapsed,
  pickBarClass,

  gridWidthPx,
  colWidth,
  rowHeight,
  groupHeaderHeight,

  rangeStart,
  stepMinutes,

  // ✅ 가로 스크롤만 이 패널이 담당
  rightScrollXRef,
  onRightScrollX,
}) {
  const pxPerMinute = colWidth / stepMinutes;

  const calcLeftWidth = (startAt, endAt) => {
    const s = toMs(startAt);
    const e = toMs(endAt);

    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
      return { left: 0, width: 0 };
    }

    const base = rangeStart.getTime();
    const leftMin = (s - base) / 60000;
    const durMin = (e - s) / 60000;

    const rawLeft = leftMin * pxPerMinute;
    const rawWidth = durMin * pxPerMinute;

    const visLeft = Math.max(0, rawLeft);
    const visRight = Math.min(gridWidthPx, rawLeft + rawWidth);
    const visWidth = Math.max(0, visRight - visLeft);

    if (visWidth <= 0) return { left: 0, width: 0 };
    return { left: visLeft, width: Math.max(2, visWidth) };
  };

  const sortTasks = (tasks) => {
    const arr = [...(tasks || [])];
    arr.sort((a, b) => {
      const as = toMs(a?.startAt);
      const bs = toMs(b?.startAt);

      if (Number.isFinite(as) && Number.isFinite(bs) && as !== bs)
        return as - bs;
      if (Number.isFinite(as) && !Number.isFinite(bs)) return -1;
      if (!Number.isFinite(as) && Number.isFinite(bs)) return 1;

      const aid = String(a?.taskId || a?.id || a?.raw?.taskId || "");
      const bid = String(b?.taskId || b?.id || b?.raw?.taskId || "");
      return aid.localeCompare(bid);
    });
    return arr;
  };

  return (
    <div className="flex-1 min-w-0 bg-white">
      {/* ✅ 세로 스크롤은 부모(보드 전체)에서 1개만 → 여기서는 X만 스크롤 */}
      <div
        ref={rightScrollXRef}
        onScroll={onRightScrollX}
        className="min-w-0 overflow-x-auto overflow-y-hidden"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
          .hide-x-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="hide-x-scrollbar">
          <div
            className="relative"
            style={{
              width: gridWidthPx,
              minWidth: gridWidthPx,
            }}
          >
            {(groups || []).map((g, gi) => {
              const isGroupCollapsed = !!collapsed?.[g.id];

              return (
                <div key={g.id}>
                  {/* product header row (오른쪽은 높이만 맞춤) */}
                  <div
                    className="border-b border-slate-200/60 bg-white"
                    style={{ height: groupHeaderHeight }}
                  />

                  {isGroupCollapsed ? null : (
                    <div>
                      {(g.operations || []).map((op) => {
                        const isOpCollapsed = opCollapsed?.[op.id] ?? false;

                        return (
                          <div
                            key={op.id}
                            className="border-b border-slate-100"
                          >
                            {/* operation row */}
                            <div
                              className="relative bg-white border-b border-slate-200/60"
                              style={{ height: rowHeight }}
                            />

                            {/* task rows */}
                            {isOpCollapsed
                              ? null
                              : sortTasks(op.tasks).map((t, ti) => {
                                  const taskId = String(
                                    t.taskId || t.id || t.raw?.taskId || "",
                                  );
                                  const worker = String(t.workerName || "");

                                  const { left, width } = calcLeftWidth(
                                    t.startAt,
                                    t.endAt,
                                  );

                                  const st = fmtHM(t.startAt);
                                  const et = fmtHM(t.endAt);
                                  const timeText =
                                    st && et ? `${st}~${et}` : st || et || "";

                                  const label = [
                                    taskId,
                                    worker || null,
                                    timeText || null,
                                  ]
                                    .filter(Boolean)
                                    .join(" ");

                                  const showBar = width > 0;

                                  return (
                                    <div
                                      key={String(
                                        t.id || `${op.id}__${taskId}__${ti}`,
                                      )}
                                      className="relative border-b border-slate-100 bg-white"
                                      style={{ height: rowHeight }}
                                      title={label}
                                    >
                                      {showBar ? (
                                        <div
                                          className={[
                                            "absolute top-1/2 -translate-y-1/2",
                                            "h-9 rounded-lg", // ✅ 살짝 더 두툼하게
                                            "shadow-sm",
                                            pickBarClass(gi),
                                          ].join(" ")}
                                          style={{ left, width }}
                                        >
                                          <div className="h-full w-full px-2 flex items-center text-[12px] font-medium text-slate-900 overflow-hidden">
                                            <span className="truncate">
                                              {label}
                                            </span>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
