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

  // ✅ 요청: 표(행) 높이 더 크게
  const rowHeight = 62;

  // ✅ 요청: 그룹 헤더는 과하게 크지 않게(살짝만)
  const groupHeaderHeight = 48;

  const leftWidth = 235;

  // ✅ 요청: 위 네모칸(헤더) 높이 줄이기
  const headerHeight = 38;

  // ✅ 하단 고정 가로 스크롤바 높이
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

  // ====== scrollX ======
  const [scrollLeft, setScrollLeft] = useState(0);

  // ====== refs ======
  const rightScrollXRef = useRef(null); // 오른쪽 내용 가로 스크롤
  const bottomXRef = useRef(null); // 하단 고정 가로 스크롤바
  const syncingRef = useRef(false);

  // ✅ X 스크롤 싱크: 오른쪽 내용 <-> 하단 고정바
  const syncX = (x) => {
    if (rightScrollXRef.current && rightScrollXRef.current.scrollLeft !== x) {
      rightScrollXRef.current.scrollLeft = x;
    }
    if (bottomXRef.current && bottomXRef.current.scrollLeft !== x) {
      bottomXRef.current.scrollLeft = x;
    }
    setScrollLeft(x); // 헤더 translateX 용
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

  // ✅ range (데이터의 최소 startAt ~ 최대 endAt 기준)
  const { rangeStart, rangeEnd, ticks } = useMemo(() => {
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
      {/* ✅ 표 라운드: 카드 자체 + 내부도 자연스럽게 */}
      <Card className="h-full w-full border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
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

          {/* ✅ 요청: 세로 스크롤은 “전체”에 1개만 */}
          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
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
                rightScrollXRef={rightScrollXRef}
                onRightScrollX={onRightScrollX}
              />
            </div>

            {/* ✅ 세로 스크롤 여유(하단 고정바 겹침 방지) */}
            <div style={{ height: bottomScrollHeight }} />
          </div>

          {/* ✅ 요청: 하단 “고정” 가로 스크롤바는 ‘간트 그래프(오른쪽)’부터 시작 */}
          <div className="shrink-0 border-t border-slate-200/70 bg-white">
            <div className="flex" style={{ height: bottomScrollHeight }}>
              {/* 왼쪽 영역은 가로 스크롤 시작에서 제외 */}
              <div
                className="shrink-0 border-r border-slate-200/70"
                style={{ width: leftWidth }}
              />

              {/* 오른쪽(그래프)만 가로 스크롤 */}
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
