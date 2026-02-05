// src/components/gantt-test/gantt-board.js
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

import GanttHeaderRow from "./gantt-header-row";
import GanttLeftPanel from "./gantt-left-panel";
import GanttRightPanel from "./gantt-right-panel";

import { buildTicks, ceilToStep, floorToStep, toMs } from "./gantt-utils";

export default function GanttBoard({ groups = [] }) {
  // ====== CONFIG ======
  const stepMinutes = 60;
  const colWidth = 120;
  const rowHeight = 50;
  const groupHeaderHeight = 50;
  const leftWidth = 235;
  const headerHeight = 44;
  const bottomScrollHeight = 16;

  // ====== collapse(product) ======
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      (groups || []).forEach((g) => {
        if (next[g.id] === undefined) next[g.id] = false; // ✅ 기본 펼침
      });
      return next;
    });
  }, [groups]);

  const toggleGroup = (id) =>
    setCollapsed((p) => ({
      ...p,
      [id]: !(p[id] ?? false),
    }));

  // ====== collapse(operation) ======
  const [opCollapsed, setOpCollapsed] = useState({});

  // ✅ groups가 API로 나중에 들어와도 opCollapsed 키가 생기게
  useEffect(() => {
    setOpCollapsed((prev) => {
      const next = { ...prev };
      (groups || []).forEach((g) => {
        (g.operations || []).forEach((op) => {
          // ✅ 기본 펼침(false) -> 바가 처음부터 보이게
          if (next[op.id] === undefined) next[op.id] = false;
        });
      });
      return next;
    });
  }, [groups]);

  const toggleOperation = (opKey) =>
    setOpCollapsed((p) => ({
      ...p,
      // ✅ undefined도 기본 펼침(false) 기준으로 토글
      [opKey]: !(p[opKey] ?? false),
    }));

  // ====== scrollX ======
  const [scrollLeft, setScrollLeft] = useState(0);

  // ====== refs ======
  const leftScrollRef = useRef(null);
  const rightScrollYRef = useRef(null);
  const rightScrollXRef = useRef(null);
  const syncingRef = useRef(false);

  const onRightScrollX = (e) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const onLeftScrollY = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    if (rightScrollYRef.current) {
      rightScrollYRef.current.scrollTop = e.currentTarget.scrollTop;
    }
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

  // ✅ range: groups -> operations -> tasks 기준으로 계산
  const { rangeStart, rangeEnd, ticks } = useMemo(() => {
    const allTasks = (groups || []).flatMap((g) =>
      (g.operations || []).flatMap((op) => op.tasks || []),
    );

    let min = Infinity;
    let max = -Infinity;

    for (const t of allTasks) {
      min = Math.min(min, toMs(t.startAt));
      max = Math.max(max, toMs(t.endAt));
    }

    // 데이터 없을 때 안전장치
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      const now = new Date();
      const start = floorToStep(now, stepMinutes);
      const end = ceilToStep(
        new Date(now.getTime() + 6 * 60 * 60 * 1000),
        stepMinutes,
      );
      return {
        rangeStart: start,
        rangeEnd: end,
        ticks: buildTicks(start, end, stepMinutes),
      };
    }

    const start = floorToStep(new Date(min), stepMinutes);
    const end = ceilToStep(new Date(max), stepMinutes);

    return {
      rangeStart: start,
      rangeEnd: end,
      ticks: buildTicks(start, end, stepMinutes),
    };
  }, [groups, stepMinutes]);

  const totalMinutes = (rangeEnd.getTime() - rangeStart.getTime()) / 60000;
  const totalCols = Math.max(1, Math.ceil(totalMinutes / stepMinutes));
  const gridWidthPx = totalCols * colWidth;

  // ====== palette ======
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

          <div className="flex flex-1 min-h-0 min-w-0">
            <GanttLeftPanel
              groups={groups}
              collapsed={collapsed}
              toggleGroup={toggleGroup}
              opCollapsed={opCollapsed}
              toggleOperation={toggleOperation}
              leftWidth={leftWidth}
              groupHeaderHeight={groupHeaderHeight}
              rowHeight={rowHeight}
              leftScrollRef={leftScrollRef}
              onLeftScrollY={onLeftScrollY}
              bottomScrollHeight={bottomScrollHeight}
            />

            <GanttRightPanel
              groups={groups}
              collapsed={collapsed}
              opCollapsed={opCollapsed}
              pickBarClass={pickBarClass}
              gridWidthPx={gridWidthPx}
              totalCols={totalCols}
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

          <div className="h-10 border-t border-slate-200/70 bg-slate-50/40" />
        </CardContent>
      </Card>
    </div>
  );
}
