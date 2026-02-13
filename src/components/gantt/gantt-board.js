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

  const rowHeight = 62;
  const groupHeaderHeight = 48;
  const leftWidth = 235;
  const headerHeight = 38;

  const bottomScrollHeight = 16;

  const [collapsed, setCollapsed] = useState({});
  const [opCollapsed, setOpCollapsed] = useState({});

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      (groups || []).forEach((g) => {
        if (next[g.id] === undefined) next[g.id] = false;
      });
      return next;
    });

    setOpCollapsed((prev) => {
      const next = { ...prev };
      (groups || []).forEach((g) => {
        (g.operations || []).forEach((op) => {
          if (next[op.id] === undefined) next[op.id] = false;
        });
      });
      return next;
    });
  }, [groups]);

  const toggleGroup = (id) =>
    setCollapsed((p) => ({ ...p, [id]: !(p[id] ?? false) }));
  const toggleOperation = (opKey) =>
    setOpCollapsed((p) => ({ ...p, [opKey]: !(p[opKey] ?? false) }));

  // ====== scroll ======
  const [scrollLeft, setScrollLeft] = useState(0);

  // ✅ 스크롤 호스트(가로+세로) 1개
  const scrollHostRef = useRef(null);

  // ✅ 하단 고정 가로 스크롤바(입력용)
  const bottomXRef = useRef(null);

  const syncingRef = useRef(false);

  const syncX = (x) => {
    const host = scrollHostRef.current;
    const bottom = bottomXRef.current;

    if (host && host.scrollLeft !== x) host.scrollLeft = x;
    if (bottom && bottom.scrollLeft !== x) bottom.scrollLeft = x;

    setScrollLeft(x);
  };

  const onHostScroll = (e) => {
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

  // ✅ range
  const { rangeStart, ticks } = useMemo(() => {
    const allTasks = (groups || []).flatMap((g) =>
      (g.operations || []).flatMap((op) => op.tasks || []),
    );

    let min = Infinity;
    let max = -Infinity;

    for (const t of allTasks) {
      const s = toMs(t.startAt);
      const e = toMs(t.endAt);
      if (Number.isFinite(s)) min = Math.min(min, s);
      if (Number.isFinite(e)) max = Math.max(max, e);
    }

    // fallback: 9시간
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
  }, [groups]);

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
      <Card className="h-full w-full border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0 flex flex-col min-h-0 h-full">
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

          {/* ✅ 스크롤은 여기 1개만(가로+세로) */}
          <div
            ref={scrollHostRef}
            onScroll={onHostScroll}
            className="flex-1 min-h-0 overflow-auto"
          >
            <div className="flex min-w-0">
              <GanttLeftPanel
                groups={groups}
                collapsed={collapsed}
                toggleGroup={toggleGroup}
                opCollapsed={opCollapsed}
                toggleOperation={toggleOperation}
                leftWidth={leftWidth}
                groupHeaderHeight={groupHeaderHeight}
                rowHeight={rowHeight}
              />

              <GanttRightPanel
                groups={groups}
                collapsed={collapsed}
                opCollapsed={opCollapsed}
                pickBarClass={pickBarClass}
                gridWidthPx={gridWidthPx}
                colWidth={colWidth}
                rowHeight={rowHeight}
                groupHeaderHeight={groupHeaderHeight}
                rangeStart={rangeStart}
                stepMinutes={stepMinutes}
                scrollLeft={scrollLeft} // ✅ RightPanel은 translate로만 이동
              />
            </div>

            {/* 하단 고정바 겹침 방지 */}
            <div style={{ height: bottomScrollHeight }} />
          </div>

          {/* ✅ 하단 고정 가로바(그래프부터 시작) */}
          <div className="shrink-0 border-t border-slate-200/70 bg-white">
            <div className="flex" style={{ height: bottomScrollHeight }}>
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
