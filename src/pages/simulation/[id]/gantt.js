// src/pages/simulation/[id]/gantt.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { useToken } from "@/stores/account-store";
import { getSimulationSchedule } from "@/api/simulation-api";

import GanttBoard from "@/components/gantt/gantt-board";
import { buildGroupsByProductOperation } from "@/components/gantt/gantt-groups";
import DashboardShell from "@/components/dashboard-shell";

export default function SimulationGanttPage() {
  const token = useToken((s) => s.token);
  const router = useRouter();
  const { id } = router.query;

  const [scheduleList, setScheduleList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [raw, setRaw] = useState([]);

  const [tab, setTab] = useState("MACHINE"); // MACHINE | PRODUCT

  // 선택 상태
  const [pickedKey, setPickedKey] = useState("");
  const [picked, setPicked] = useState(null); // {machineId, taskId} or {productName, operationName, taskName}

  useEffect(() => {
    if (!token || !id) return;

    setLoading(true);
    setErr("");

    getSimulationSchedule(id, token)
      .then((res) => setScheduleList(res?.scheduleList ?? []))
      .catch((e) => setErr(e?.message || "조회 실패"))
      .finally(() => setLoading(false));
  }, [token, id]);

  // ✅ useMemo는 반드시 컴포넌트 안에서!
  const groups = useMemo(() => {
    return buildGroupsByProductOperation(scheduleList);
  }, [scheduleList]);

  if (loading) return <div className="p-6">로딩 중...</div>;
  if (err) return <div className="p-6 text-red-600 font-semibold">{err}</div>;

  return (
    <DashboardShell>
      <div className="p-3 h-[calc(100vh-120px)] min-h-0">
        <GanttBoard groups={groups} />
      </div>
    </DashboardShell>
  );
}
