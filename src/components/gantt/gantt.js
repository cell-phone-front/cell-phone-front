"use client";

import React, { useMemo, useState } from "react";
import GanttBoard from "@/components/gantt/gantt-board";
import { Button } from "../ui/button";

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
  const [activeTab, setActiveTab] = useState("work");

  const groups = useMemo(() => {
    return makeGroups({ groupCount, tasksPerGroup });
  }, [groupCount, tasksPerGroup]);

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {/* 상단 바 (jobs 느낌으로 맞춤) */}
      <div className="h-15 shrink-0 px-3 flex items-center ">
        {/* 왼쪽 탭 */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("work")}
            className={[
              "text-lg font-semibold leading-none",
              "bg-transparent hover:bg-transparent",
              "underline-offset-10 decoration-2",
              activeTab === "work"
                ? "text-gray-900 underline decoration-gray-900"
                : "text-gray-400 hover:text-gray-700 hover:underline hover:decoration-gray-300",
            ].join(" ")}
          >
            작업
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tool")}
            className={[
              "text-lg font-semibold leading-none",
              "bg-transparent hover:bg-transparent",
              "underline-offset-10 decoration-2",
              activeTab === "tool"
                ? "text-gray-900 underline decoration-gray-900"
                : "text-gray-400 hover:text-gray-700 hover:underline hover:decoration-gray-300",
            ].join(" ")}
          >
            툴
          </button>
        </div>

        {/* 오른쪽 입력 */}
        <div className="ml-auto flex items-center gap-6 text-sm text-gray-600">
          <label className="flex items-center gap-2">
            그룹
            <input
              type="number"
              min={1}
              max={30}
              value={groupCount}
              onChange={(e) => setGroupCount(Number(e.target.value || 1))}
              className="h-9 w-16 rounded-md border px-2 text-sm"
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
              className="h-9 w-16 rounded-md border px-2 text-sm"
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
