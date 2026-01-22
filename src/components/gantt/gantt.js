"use client";

import React, { useMemo, useState } from "react";
import GanttBoard from "@/components/gantt/gantt-board";

function addMin(date, min) {
  return new Date(date.getTime() + min * 60 * 1000);
}

function makeGroups({ groupCount = 4, tasksPerGroup = 6 }) {
  const base = new Date();
  base.setMinutes(0, 0, 0);

  // 오늘 09:00 시작
  const startBase = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    9,
    0,
    0,
  );

  const groups = [];

  for (let gi = 0; gi < groupCount; gi++) {
    const groupId = `TOOL-${String(gi + 1).padStart(2, "0")}`;

    let cursor = addMin(startBase, gi * 30); // 그룹마다 시작 시간 조금씩 다르게
    const tasks = [];

    for (let ti = 0; ti < tasksPerGroup; ti++) {
      const dur = 60 + (ti % 3) * 60; // 60/120/180 분
      const gap = 10 + (ti % 2) * 20; // 10/30 분

      const startAt = cursor;
      const endAt = addMin(cursor, dur);

      tasks.push({
        id: `${groupId}-T${ti + 1}`,
        name: `TSK_${groupId}_${ti + 1}`,
        startAt,
        endAt,
        seq: ti + 1,
      });

      cursor = addMin(endAt, gap);
    }

    groups.push({
      id: groupId,
      title: groupId,
      tasks,
    });
  }

  return groups;
}

export default function Gantt() {
  const [groupCount, setGroupCount] = useState(4);
  const [tasksPerGroup, setTasksPerGroup] = useState(6);

  const groups = useMemo(() => {
    return makeGroups({ groupCount, tasksPerGroup });
  }, [groupCount, tasksPerGroup]);

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {/* 상단 바  */}
      <div className="h-11 shrink-0 px-3 flex items-center gap-3">
        <div className="font-semibold">member</div>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            그룹
            <input
              type="number"
              min={1}
              max={30}
              value={groupCount}
              onChange={(e) => setGroupCount(Number(e.target.value || 1))}
              className="w-16 border rounded px-2 py-1"
            />
          </label>

          <label className="flex items-center gap-2">
            작업/그룹
            <input
              type="number"
              min={1}
              max={50}
              value={tasksPerGroup}
              onChange={(e) => setTasksPerGroup(Number(e.target.value || 1))}
              className="w-16 border rounded px-2 py-1"
            />
          </label>
        </div>
      </div>

      {/* 본문은 무조건 flex-1 + min-h-0 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <GanttBoard groups={groups} />
      </div>
    </div>
  );
}
