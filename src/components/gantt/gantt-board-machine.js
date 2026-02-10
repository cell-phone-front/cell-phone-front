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
  const groupHeaderHeight = 50;
  const leftWidth = 235;
  const headerHeight = 44;
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

  // ====== scrollX ======
  const [scrollLeft, setScrollLeft] = useState(0);

  // ====== refs ======
  const leftScrollRef = useRef(null);
  const rightScrollYRef = useRef(null);
  const rightScrollXRef = useRef(null);
  const bottomXRef = useRef(null);
  const syncingRef = useRef(false);

  const syncX = (x) => {
    if (rightScrollXRef.current && rightScrollXRef.current.scrollLeft !== x) {
      rightScrollXRef.current.scrollLeft = x;
    }
    if (bottomXRef.current && bottomXRef.current.scrollLeft !== x) {
      bottomXRef.current.scrollLeft = x;
    }
    setScrollLeft(x);
  };

  const onRightScrollX = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    syncX(e.currentTarget.scrollLeft);
    syncingRef.current = false;
  };

  const onBottomScrollX = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    syncX(e.currentTarget.scrollLeft);
    syncingRef.current = false;
  };

  const onRightScrollY = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    syncingRef.current = false;
  };

  // ✅ range: 데이터 min startAt ~ max endAt 기준 (09:00 강제 없음)
  const { rangeStart, rangeEnd, ticks } = useMemo(() => {
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
      const start = new Date();
      const end = new Date(start.getTime() + 9 * 60 * 60 * 1000);
      const startAligned = floorToStep(start, stepMinutes);
      const endAligned = ceilToStep(end, stepMinutes);

      return {
        rangeStart: startAligned,
        rangeEnd: endAligned,
        ticks: buildTicks(startAligned, endAligned, stepMinutes),
      };
    }

    const startAligned = floorToStep(new Date(min), stepMinutes);
    let endAligned = ceilToStep(new Date(max), stepMinutes);

    if (endAligned.getTime() <= startAligned.getTime()) {
      endAligned = new Date(startAligned.getTime() + 9 * 60 * 60 * 1000);
      endAligned = ceilToStep(endAligned, stepMinutes);
    }

    return {
      rangeStart: startAligned,
      rangeEnd: endAligned,
      ticks: buildTicks(startAligned, endAligned, stepMinutes),
    };
  }, [groups, stepMinutes]);

  const totalCols = Math.max(1, (ticks || []).length);
  const gridWidthPx = totalCols * colWidth;

  // palette
  const barPalette = [
    "bg-[#86DCF0] border border-[#86DCF0]/60",
    "bg-[#869AF0] border border-[#869AF0]/60",
    "bg-[#85BAEF] border border-[#85BAEF]/60",
    "bg-[#34F7DC] border border-[#34F7DC]/60",
  ];
  const pickBarClass = (gi) => barPalette[gi % barPalette.length];

  return (
    <div className="h-full w-full min-h-0 overflow-hidden">
      <Card className="h-full w-full border border-slate-200/80 rounded-xl shadow-sm">
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

          <div
            className="flex flex-1 min-h-0 min-w-0"
            style={{ paddingBottom: bottomScrollHeight }}
          >
            <GanttLeftPanelMachine
              groups={groups}
              collapsed={collapsed}
              toggleGroup={toggleGroup}
              leftWidth={leftWidth}
              groupHeaderHeight={groupHeaderHeight}
              rowHeight={rowHeight}
              leftScrollRef={leftScrollRef}
              bottomScrollHeight={bottomScrollHeight}
            />

            <GanttRightPanelMachine
              groups={groups}
              collapsed={collapsed}
              pickBarClass={pickBarClass}
              gridWidthPx={gridWidthPx}
              colWidth={colWidth}
              rowHeight={rowHeight}
              groupHeaderHeight={groupHeaderHeight}
              bottomScrollHeight={bottomScrollHeight}
              rangeStart={rangeStart}
              stepMinutes={stepMinutes}
              scrollLeft={scrollLeft}
              rightScrollYRef={rightScrollYRef}
              onRightScrollY={onRightScrollY}
              rightScrollXRef={rightScrollXRef}
              onRightScrollX={onRightScrollX}
            />
          </div>

          <div
            className="shrink-0 border-t border-slate-200/70 bg-white"
            style={{ height: bottomScrollHeight }}
          >
            <div
              ref={bottomXRef}
              onScroll={onBottomScrollX}
              className="h-full overflow-x-auto overflow-y-hidden"
            >
              <div style={{ width: gridWidthPx + 240, height: 1 }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
