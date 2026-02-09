// src/components/gantt-test/gantt-right-panel.js
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
  bottomScrollHeight,

  rangeStart,
  stepMinutes,

  scrollLeft,

  rightScrollYRef,
  onRightScrollY,

  rightScrollXRef,
  onRightScrollX,
}) {
  // ✅ 분당 px 비율
  const pxPerMinute = colWidth / stepMinutes;

  // ✅ 바 위치 계산 (클램프 포함: 잘림 해결)
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

    // ✅ 화면 범위로 클램프 (0 ~ gridWidthPx)
    const visLeft = Math.max(0, rawLeft);
    const visRight = Math.min(gridWidthPx, rawLeft + rawWidth);
    const visWidth = Math.max(0, visRight - visLeft);

    if (visWidth <= 0) return { left: 0, width: 0 };

    return { left: visLeft, width: Math.max(2, visWidth) };
  };

  // ✅ Right에서만이라도 task 순서가 흔들리지 않게 방어 정렬
  const sortTasks = (tasks) => {
    const arr = [...(tasks || [])];
    arr.sort((a, b) => {
      const as = toMs(a?.startAt);
      const bs = toMs(b?.startAt);

      // startAt 둘 다 유효하면 시간순
      if (Number.isFinite(as) && Number.isFinite(bs) && as !== bs)
        return as - bs;

      // 유효/무효 섞이면 유효한 걸 앞으로
      if (Number.isFinite(as) && !Number.isFinite(bs)) return -1;
      if (!Number.isFinite(as) && Number.isFinite(bs)) return 1;

      // 마지막: taskId 문자열 기준
      const aid = String(a?.taskId || a?.id || a?.raw?.taskId || "");
      const bid = String(b?.taskId || b?.id || b?.raw?.taskId || "");
      return aid.localeCompare(bid);
    });
    return arr;
  };

  return (
    <div className="flex-1 min-w-0 min-h-0 bg-white">
      {/* ✅ Y 스크롤: 여기만 1개 (왼쪽과 scrollTop 동기화) */}
      <div
        ref={rightScrollYRef}
        onScroll={onRightScrollY}
        className="h-full min-h-0 overflow-y-auto"
        style={{ paddingBottom: bottomScrollHeight }}
      >
        {/* ✅ X 스크롤 컨테이너는 유지하되 스크롤바는 숨김 */}
        <div
          ref={rightScrollXRef}
          onScroll={onRightScrollX}
          className="min-w-0 overflow-x-auto"
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

                    {/* 그룹 접힘 */}
                    {isGroupCollapsed ? null : (
                      <div>
                        {(g.operations || []).map((op) => {
                          const isOpCollapsed = opCollapsed?.[op.id] ?? false;

                          return (
                            <div
                              key={op.id}
                              className="border-b border-slate-100"
                            >
                              {/* operation row (오른쪽에도 구분선/가이드 추가) */}
                              <div
                                className="relative bg-white border-b border-slate-200/60"
                                style={{ height: rowHeight }}
                              ></div>

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

                                    // ✅ 중요: width가 0이어도 "행은 렌더"해야 좌/우가 안 어긋남
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
                                              "h-8 rounded-md",
                                              "shadow-sm",
                                              pickBarClass(gi),
                                            ].join(" ")}
                                            style={{ left, width }}
                                          >
                                            <div className="h-full w-full px-2 flex items-center text-[12px] font-semibold text-slate-900 overflow-hidden">
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

              {/* bottom spacing */}
              <div
                className="bg-white"
                style={{ height: bottomScrollHeight }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
