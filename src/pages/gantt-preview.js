import React from "react";
import {
  Gantt,
  GanttHeader,
  GanttContent,
  GanttFooter,
} from "@/components/ui/gantt";

const groups = [
  {
    id: "job-bread-a",
    title: "Bread-A",
    tasks: [
      {
        id: "t1",
        name: "반죽",
        startAt: "2026-01-13T09:00:00",
        endAt: "2026-01-13T13:00:00",
      },
      {
        id: "t2",
        name: "발효",
        startAt: "2026-01-13T13:00:00",
        endAt: "2026-01-13T19:00:00",
      },
      {
        id: "t3",
        name: "굽기",
        startAt: "2026-01-13T19:00:00",
        endAt: "2026-01-13T21:00:00",
      },
    ],
  },
  {
    id: "job-bread-b",
    title: "Bread-B",
    tasks: [
      {
        id: "t4",
        name: "반죽",
        startAt: "2026-01-13T10:00:00",
        endAt: "2026-01-13T12:00:00",
      },
      {
        id: "t5",
        name: "발효",
        startAt: "2026-01-13T12:00:00",
        endAt: "2026-01-13T16:00:00",
      },
      {
        id: "t6",
        name: "굽기",
        startAt: "2026-01-13T16:00:00",
        endAt: "2026-01-13T18:00:00",
      },
    ],
  },
];

export default function GanttPreview() {
  return (
    <div className="min-h-screen bg-background">
      <Gantt
        options={{
          title: "GPT 간트 미리보기",
          showHeader: true,
        }}
      >
        <GanttHeader />
        <GanttContent data={groups} />
        <GanttFooter />
      </Gantt>
    </div>
  );
}
