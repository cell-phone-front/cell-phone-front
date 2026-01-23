// src/components/gantt-test/gantt-board.js

import React, { useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import GanttHeaderRow from "./gantt-header-row";
import GanttLeftPanel from "./gantt-left-panel";
import GanttRightPanel from "./gantt-right-panel";

import {
  buildTicks,
  ceilToStep,
  dayKey,
  floorToStep,
  fmtHM,
  toMs,
} from "./gantt-utils";

export default function GanttBoard({ groups }) {
  // ====== CONFIG ======
  const stepMinutes = 60;
  const colWidth = 120;
  // 행전체높이
  const rowHeight = 50;
  // 표 타이틀높이
  const groupHeaderHeight = 50;
  const leftWidth = 235;
  const headerHeight = 40;
  const bottomScrollHeight = 16;

  // ====== collapse ======
  const [activeTab, setActiveTab] = useState("work");
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(groups.map((g) => [g.id, false])),
  );

  const toggleGroup = (id) =>
    setCollapsed((p) => ({
      ...p,
      [id]: !p[id],
    }));

  // ====== scrollX (아래 가로 스크롤바) ======
  const [scrollLeft, setScrollLeft] = useState(0);

  // ====== refs ======
  const leftScrollRef = useRef(null);
  const rightScrollYRef = useRef(null);
  const rightScrollXRef = useRef(null);
  const headerInnerRef = useRef(null);
  const syncingRef = useRef(false);

  //  아래 가로 스크롤바 움직일 때
  const onRightScrollX = (e) => {
    const x = e.currentTarget.scrollLeft;
    setScrollLeft(x);

    if (headerInnerRef.current) {
      headerInnerRef.current.style.transform = `translateX(${-x}px)`;
    }
  };

  // 왼쪽 세로 -> 오른쪽 세로 동기화
  const onLeftScrollY = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    if (rightScrollYRef.current) {
      rightScrollYRef.current.scrollTop = e.currentTarget.scrollTop;
    }

    syncingRef.current = false;
  };

  // 오른쪽 세로 -> 왼쪽 세로 동기화
  const onRightScrollY = (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }

    syncingRef.current = false;
  };

  // ====== range ======
  const { rangeStart, rangeEnd, ticks } = useMemo(() => {
    const allTasks = groups.flatMap((g) => g.tasks);
    let min = Infinity,
      max = -Infinity;

    for (const t of allTasks) {
      min = Math.min(min, toMs(t.startAt));
      max = Math.max(max, toMs(t.endAt));
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

  // ====== now line ======
  const now = new Date();
  const showNow = now >= rangeStart && now <= rangeEnd;

  const nowLeftPx = useMemo(() => {
    const diffMin = (now.getTime() - rangeStart.getTime()) / 60000;
    const ratio = diffMin / (totalCols * stepMinutes);
    return Math.max(0, Math.min(gridWidthPx, ratio * gridWidthPx));
  }, [rangeStart, totalCols, stepMinutes, gridWidthPx]);

  // ====== palette ======
  const barPalette = [
    "bg-blue-500/18 border-blue-500/35",
    "bg-amber-400/22 border-amber-500/35",
    "bg-emerald-500/18 border-emerald-500/35",
    "bg-violet-500/18 border-violet-500/35",
  ];

  const pickBarClass = (gi) => barPalette[gi % barPalette.length];

  return (
    <div className="h-full w-full min-h-0 overflow-hidden">
      <Card className="h-full w-full border-border/60">
        {/* <CardHeader className="py-2 px-3 gap-1">
          <div className="flex f-col gap-3">
            <CardTitle className="text-lg tracking-tight">Schedule</CardTitle>

            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {dayKey(rangeStart)} {fmtHM(rangeStart)} ~ {dayKey(rangeEnd)}{" "}
                  {fmtHM(rangeEnd)}
                </span>
              </div>

              <Badge variant="secondary" className="text-[11px]">
                {stepMinutes}m
              </Badge>
            </div>
          </div>
        </CardHeader> */}

        {/* 헤더 스케줄 밑에 선 */}
        {/* <Separator /> */}

        <CardContent className="p-0 flex flex-col min-h-0">
          {/* 헤더 */}
          <GanttHeaderRow
            leftWidth={leftWidth}
            headerHeight={headerHeight}
            gridWidthPx={gridWidthPx}
            colWidth={colWidth}
            totalCols={totalCols}
            ticks={ticks}
            rangeStart={rangeStart}
            stepMinutes={stepMinutes}
            headerInnerRef={headerInnerRef}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            scrollLeft={scrollLeft}
          />

          <div className="flex flex-1 min-h-0 min-w-0">
            <GanttLeftPanel
              groups={groups}
              collapsed={collapsed}
              toggleGroup={toggleGroup}
              leftWidth={leftWidth}
              groupHeaderHeight={groupHeaderHeight}
              rowHeight={rowHeight}
              leftScrollRef={leftScrollRef}
              onLeftScrollY={onLeftScrollY}
              bottomScrollHeight={bottomScrollHeight}
            />
            {/* 본문 */}
            <GanttRightPanel
              groups={groups}
              collapsed={collapsed}
              pickBarClass={pickBarClass}
              gridWidthPx={gridWidthPx}
              totalCols={totalCols}
              colWidth={colWidth}
              rowHeight={rowHeight}
              groupHeaderHeight={groupHeaderHeight}
              bottomScrollHeight={bottomScrollHeight}
              rangeStart={rangeStart}
              stepMinutes={stepMinutes}
              showNow={showNow}
              nowLeftPx={nowLeftPx}
              scrollLeft={scrollLeft}
              rightScrollYRef={rightScrollYRef}
              onRightScrollY={onRightScrollY}
              rightScrollXRef={rightScrollXRef}
              onRightScrollX={onRightScrollX}
            />
          </div>

          <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-t border-border/60" />
        </CardContent>
      </Card>
    </div>
  );
}
