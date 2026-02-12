// src/components/dashboard/gantt.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToken } from "@/stores/account-store";
import { getSimulations, getSimulationSchedule } from "@/api/simulation-api";
import DashboardGanttBoard from "@/components/dashboard-gantt/board";
import { buildGroupsByProductOperation } from "@/components/gantt/gantt-groups";

function ensureKST(v) {
  try {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString();

    const s = String(v).trim();
    if (!s) return "";

    const hasTZ = /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
    return hasTZ ? s : `${s}+09:00`;
  } catch {
    return "";
  }
}

function taskHasBarLikeScheduleItem(s) {
  const startRaw = s?.startAt ?? s?.start ?? s?.startTime;
  const endRaw = s?.endAt ?? s?.end ?? s?.endTime;

  const startIso = ensureKST(startRaw);
  const endIso = ensureKST(endRaw);

  const sd = startIso ? new Date(startIso) : new Date(NaN);
  const ed = endIso ? new Date(endIso) : new Date(NaN);

  const a = sd.getTime();
  const b = ed.getTime();

  return Number.isFinite(a) && Number.isFinite(b) && b - a >= 60 * 1000;
}

function getId(sim) {
  return (
    sim?.id ??
    sim?.simulationId ??
    sim?.simulation_id ??
    sim?.scheduleId ??
    sim?._id ??
    ""
  );
}

function pickLatestSim(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  if (!arr.length) return null;

  arr.sort((a, b) => {
    const ad = String(a?.simulationStartDate || a?.createdAt || "");
    const bd = String(b?.simulationStartDate || b?.createdAt || "");
    if (ad && bd && ad !== bd) return bd.localeCompare(ad);
    return String(getId(b)).localeCompare(String(getId(a)));
  });

  return arr[0] || null;
}

function pruneGroupsForBars(groups) {
  const gs = Array.isArray(groups) ? groups : [];

  return gs
    .map((g) => {
      const ops = (g.operations || [])
        .map((op) => {
          const tasks = (op.tasks || []).filter((t) => {
            const s = ensureKST(t?.startAt ?? t?.start ?? t?.startTime);
            const e = ensureKST(t?.endAt ?? t?.end ?? t?.endTime);

            const sd = s ? new Date(s) : new Date(NaN);
            const ed = e ? new Date(e) : new Date(NaN);

            const a = sd.getTime();
            const b = ed.getTime();

            return (
              Number.isFinite(a) && Number.isFinite(b) && b - a >= 60 * 1000
            );
          });

          return { ...op, tasks };
        })
        .filter((op) => (op.tasks || []).length > 0);

      return { ...g, operations: ops };
    })
    .filter((g) => (g.operations || []).length > 0);
}

export default function DashboardGantt() {
  const token = useToken((s) => s.token);

  const [scheduleList, setScheduleList] = useState([]);
  const [latestSim, setLatestSim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const fetchLatest = async () => {
      if (!token) return;

      setLoading(true);
      setErr("");

      try {
        const simJson = await getSimulations(token);
        const simList = simJson?.simulationScheduleList || [];
        const latest = pickLatestSim(simList);

        setLatestSim(latest);

        const latestId = String(getId(latest) || "");
        if (!latestId) {
          setScheduleList([]);
          setErr("시뮬레이션이 없습니다.");
          return;
        }

        const res = await getSimulationSchedule(latestId, token);
        setScheduleList(res?.scheduleList ?? []);
      } catch (e) {
        setErr(e?.message || "간트 조회 실패");
        setScheduleList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();
  }, [token]);

  const ganttList = useMemo(() => {
    const list = Array.isArray(scheduleList) ? scheduleList : [];

    return list
      .map((s) => {
        const startRaw = s?.startAt ?? s?.start ?? s?.startTime;
        const endRaw = s?.endAt ?? s?.end ?? s?.endTime;

        const startIso = ensureKST(startRaw);
        const endIso = ensureKST(endRaw);

        const startDate = startIso ? new Date(startIso) : new Date(NaN);
        const endDate = endIso ? new Date(endIso) : new Date(NaN);

        return {
          ...s,
          startAt: startRaw ?? s?.startAt,
          endAt: endRaw ?? s?.endAt,
          start: startDate,
          end: endDate,
          startTime: startDate,
          endTime: endDate,
        };
      })
      .filter(taskHasBarLikeScheduleItem);
  }, [scheduleList]);

  const groups = useMemo(() => {
    const built = buildGroupsByProductOperation(ganttList);
    return pruneGroupsForBars(built);
  }, [ganttList]);

  // ✅ 대시보드에서는 없으면 숨김
  if (!loading && !err && groups.length === 0) return null;

  // ✅ 메타: left.js가 쓰는 형태로 맞춰서 전달
  const meta = latestSim
    ? {
        id: getId(latestSim),
        title: latestSim?.title ?? latestSim?.simulationTitle ?? "",
        description: latestSim?.description ?? latestSim?.desc ?? "",
        simulationStartDate:
          latestSim?.simulationStartDate ?? latestSim?.startDate ?? "",
      }
    : null;

  return (
    <div className="h-full min-h-0 overflow-hidden">
      {loading ? (
        <div className="h-full grid place-items-center text-[12px] text-slate-500">
          불러오는 중...
        </div>
      ) : err ? (
        <div className="h-full grid place-items-center text-[12px] text-rose-600">
          {err}
        </div>
      ) : (
        <DashboardGanttBoard groups={groups} meta={meta} />
      )}
    </div>
  );
}
