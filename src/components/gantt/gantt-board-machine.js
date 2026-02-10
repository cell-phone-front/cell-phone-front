// src/components/gantt-test/gantt-board-machine.js
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

import GanttHeaderRow from "./gantt-header-row";
import GanttLeftPanelMachine from "./gantt-left-panel-machine";
import GanttRightPanelMachine from "./gantt-right-panel-machine";

import { buildTicks, ceilToStep, floorToStep, toMs } from "./gantt-utils";

export default function GanttBoardMachine({ groups = [] }) {
  // ====== CONFIG ======
  const stepMinutes = 60;
  const colWidth = 120;

  const rowHeight = 50;
  const groupHeaderHeight = 48;

  const leftWidth = 235;
  const headerHeight = 38;

  // ✅ 하단 고정 가로 스크롤바 높이
  const bottomScrollHeight = 16;

  const [collapsed, setCollapsed] = useState({});
  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      (groups || []).forEach((g) => {
        if (next[g.id] === undefined) next[g.id] = false;
      });
      return next;
    });
  }, [groups]);

  const toggleGroup = (id) =>
    setCollapsed((p) => ({ ...p, [id]: !(p[id] ?? false) }));

  // ====== scroll sync ======
  const [scrollLeft, setScrollLeft] = useState(0);

  // ✅ “세로 스크롤”은 오른쪽 1곳만 (left는 따라가기만)
  const leftYRef = useRef(null);
  const rightYRef = useRef(null);

  // ✅ “가로 스크롤”은 아래 바 1곳만 (right content는 따라가기만)
  const rightXRef = useRef(null);
  const bottomXRef = useRef(null);

  const syncingRef = useRef(false);

  const syncX = (x) => {
    if (rightXRef.current && rightXRef.current.scrollLeft !== x) {
      rightXRef.current.scrollLeft = x;
    }
    if (bottomXRef.current && bottomXRef.current.scrollLeft !== x) {
      bottomXRef.current.scrollLeft = x;
    }
    setScrollLeft(x);
  };

  const onBottomScrollX = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    syncX(e.currentTarget.scrollLeft);
    syncingRef.current = false;
  };

  // ✅ 오른쪽 내용에서 휠/트랙패드로 가로 이동(shift/trackpad) 들어올 수 있어서
  // 오른쪽 X 스크롤이 바뀌면 하단바도 따라가게(단, 오른쪽에는 스크롤바는 안 보이게)
  const onRightScrollX = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    syncX(e.currentTarget.scrollLeft);
    syncingRef.current = false;
  };

  const onRightScrollY = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const y = e.currentTarget.scrollTop;
    if (leftYRef.current && leftYRef.current.scrollTop !== y) {
      leftYRef.current.scrollTop = y;
    }

    syncingRef.current = false;
  };

  // ✅ range
  const { rangeStart, ticks } = useMemo(() => {
    const allTasks = (groups || []).flatMap((g) => g.tasks || []);

    let min = Infinity;
    let max = -Infinity;

    for (const t of allTasks) {
      const s = toMs(t.startAt);
      const e = toMs(t.endAt);
      if (Number.isFinite(s)) min = Math.min(min, s);
      if (Number.isFinite(e)) max = Math.max(max, e);
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      const start = floorToStep(new Date(), stepMinutes);
      const end = ceilToStep(
        new Date(start.getTime() + 9 * 60 * 60 * 1000),
        stepMinutes,
      );
      return { rangeStart: start, ticks: buildTicks(start, end, stepMinutes) };
    }

    const startAligned = floorToStep(new Date(min), stepMinutes);
    let endAligned = ceilToStep(new Date(max), stepMinutes);

    if (endAligned.getTime() <= startAligned.getTime()) {
      endAligned = ceilToStep(
        new Date(startAligned.getTime() + 9 * 60 * 60 * 1000),
        stepMinutes,
      );
    }

    return {
      rangeStart: startAligned,
      ticks: buildTicks(startAligned, endAligned, stepMinutes),
    };
  }, [groups, stepMinutes]);

  const totalCols = Math.max(1, (ticks || []).length);
  const gridWidthPx = totalCols * colWidth;

  const barPalette = [
    "bg-[#86DCF0] border border-[#86DCF0]/60",
    "bg-[#869AF0] border border-[#869AF0]/60",
    "bg-[#85BAEF] border border-[#85BAEF]/60",
    "bg-[#34F7DC] border border-[#34F7DC]/60",
  ];
  const pickBarClass = (gi) => barPalette[gi % barPalette.length];

  return (
    <div className="h-full w-full min-h-0 overflow-hidden">
      <Card className="h-full w-full border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-0 flex flex-col min-h-0">
          <GanttHeaderRow
            leftWidth={leftWidth}
            headerHeight={headerHeight}
            gridWidthPx={gridWidthPx}
            colWidth={colWidth}
            totalCols={totalCols}
            ticks={ticks}
            rangeStart={rangeStart}
            stepMinutes={stepMinutes}
            scrollLeft={scrollLeft}
          />

          {/* ✅ BODY: 스크롤 주체는 오른쪽 Y만 */}
          <div className="flex-1 min-h-0 min-w-0">
            <div className="flex h-full min-w-0">
              <GanttLeftPanelMachine
                groups={groups}
                collapsed={collapsed}
                toggleGroup={toggleGroup}
                leftWidth={leftWidth}
                groupHeaderHeight={groupHeaderHeight}
                rowHeight={rowHeight}
                leftYRef={leftYRef}
              />

              <GanttRightPanelMachine
                groups={groups}
                collapsed={collapsed}
                pickBarClass={pickBarClass}
                gridWidthPx={gridWidthPx}
                colWidth={colWidth}
                rowHeight={rowHeight}
                groupHeaderHeight={groupHeaderHeight}
                rangeStart={rangeStart}
                stepMinutes={stepMinutes}
                rightYRef={rightYRef}
                onRightScrollY={onRightScrollY}
                rightXRef={rightXRef}
                onRightScrollX={onRightScrollX}
                bottomScrollHeight={bottomScrollHeight}
              />
            </div>
          </div>

          {/* ✅ 하단 고정 가로 스크롤바 (이거 하나만 보이게) */}
          <div className="shrink-0 border-t border-slate-200/70 bg-white">
            <div className="flex" style={{ height: bottomScrollHeight }}>
              {/* 왼쪽 영역은 가로 스크롤 시작에서 제외 */}
              <div
                className="shrink-0 border-r border-slate-200/70"
                style={{ width: leftWidth }}
              />
              <div className="flex-1 min-w-0">
                <div
                  ref={bottomXRef}
                  onScroll={onBottomScrollX}
                  className="h-full overflow-x-auto overflow-y-hidden"
                >
                  {/* ✅ 여기 width는 grid와 동일 */}
                  <div style={{ width: gridWidthPx, height: 1 }} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
