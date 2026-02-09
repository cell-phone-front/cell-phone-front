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
  const leftScrollRef = useRef(null); // 왼쪽은 스크롤바는 숨기되, scrollTop 동기화용으로만 씀
  const rightScrollYRef = useRef(null); // 오른쪽 세로 스크롤(유일)
  const rightScrollXRef = useRef(null); // 오른쪽 가로 스크롤(실제 내용)
  const bottomXRef = useRef(null); // ✅ 하단 고정 가로 스크롤바
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

  // ✅ Y 스크롤: 오른쪽만 스크롤, 왼쪽은 따라가기
  const onRightScrollY = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }

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

    // ✅ 데이터가 없으면 "지금 ~ +9시간" (원하시면 다른 기본값으로 변경 가능)
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      const start = new Date();
      const end = new Date(start.getTime() + 9 * 60 * 60 * 1000);

      const startAligned = floorToStep(start, stepMinutes); // ✅ 시작은 floor
      const endAligned = ceilToStep(end, stepMinutes); // ✅ 끝은 ceil

      return {
        rangeStart: startAligned,
        rangeEnd: endAligned,
        ticks: buildTicks(startAligned, endAligned, stepMinutes),
      };
    }

    // ✅ 시작: 데이터 최소 startAt을 stepMinutes 기준으로 "내림(floor)"
    const startAligned = floorToStep(new Date(min), stepMinutes);

    // ✅ 끝: 데이터 최대 endAt을 stepMinutes 기준으로 "올림(ceil)"
    let endAligned = ceilToStep(new Date(max), stepMinutes);

    // end가 start보다 작으면 최소 9시간은 보여주기
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

          {/* ✅ 본문: 아래 고정 스크롤바 자리(bottomScrollHeight)만큼 빼서 높이 확보 */}
          <div
            className="flex flex-1 min-h-0 min-w-0"
            style={{ paddingBottom: bottomScrollHeight }}
          >
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
              bottomScrollHeight={bottomScrollHeight}
              rangeStart={rangeStart}
              gridWidthPx={gridWidthPx}
              colWidth={colWidth}
              stepMinutes={stepMinutes}
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

          {/* ✅ 하단 “고정” 가로 스크롤바 */}
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
