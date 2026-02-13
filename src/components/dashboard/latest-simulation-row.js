"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToken } from "@/stores/account-store";
import { getSimulations, getSimulationSchedule } from "@/api/simulation-api";

import LeftMeta from "@/components/dashboard-gantt/left";
import RightBars from "@/components/dashboard-gantt/right";
import { safeText } from "@/components/dashboard-gantt/util";

import MachineDonut from "@/components/dashboard-gantt/machine";
import { buildGroupsByMachine } from "@/components/gantt/gantt-groups-machine";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* ===============================
  utils
=============================== */
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

/** ✅ 지금 실제 응답이 simulationList 라서 이것 반드시 처리 */
function normalizeSimulationList(simJson) {
  const a =
    simJson?.simulationList ?? // ✅ 실제 응답
    simJson?.simulationScheduleList ??
    simJson?.simulations?.simulationList ??
    simJson?.simulations?.simulationScheduleList ??
    simJson?.data?.simulationList ??
    simJson?.data?.simulationScheduleList ??
    simJson?.result?.simulationList ??
    simJson?.result?.simulationScheduleList ??
    simJson?.items ??
    simJson?.list ??
    [];

  return Array.isArray(a) ? a : [];
}

/** ✅ 스케줄 응답도 케이스 다양하게 흡수 */
function normalizeScheduleList(res) {
  const a =
    res?.scheduleList ??
    res?.simulationScheduleList ??
    res?.data?.scheduleList ??
    res?.data?.simulationScheduleList ??
    res?.result?.scheduleList ??
    res?.result?.simulationScheduleList ??
    res?.items ??
    res?.taskList ??
    res?.tasks ??
    [];

  return Array.isArray(a) ? a : [];
}

function toTimeMs(d) {
  const x = d instanceof Date ? d : new Date(d);
  const t = x.getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * ✅ 최신 시뮬 선택 기준(강화)
 * 1) createdAt 우선 (있으면)
 * 2) 없으면 simulationStartDate
 * 3) 그래도 없으면 id fallback
 */
function pickLatestSim(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  if (!arr.length) return null;

  arr.sort((a, b) => {
    const aCreated = a?.createdAt ? toTimeMs(a.createdAt) : NaN;
    const bCreated = b?.createdAt ? toTimeMs(b.createdAt) : NaN;

    if (
      Number.isFinite(aCreated) &&
      Number.isFinite(bCreated) &&
      aCreated !== bCreated
    ) {
      return bCreated - aCreated;
    }

    const aStart = a?.simulationStartDate
      ? toTimeMs(a.simulationStartDate)
      : NaN;
    const bStart = b?.simulationStartDate
      ? toTimeMs(b.simulationStartDate)
      : NaN;

    if (
      Number.isFinite(aStart) &&
      Number.isFinite(bStart) &&
      aStart !== bStart
    ) {
      return bStart - aStart;
    }

    // 날짜가 문자열인 경우라도 대비(YYYY-MM-DD)
    const ad = String(a?.simulationStartDate || a?.createdAt || "");
    const bd = String(b?.simulationStartDate || b?.createdAt || "");
    if (ad && bd && ad !== bd) return bd.localeCompare(ad);

    return String(getId(b)).localeCompare(String(getId(a)));
  });

  return arr[0] || null;
}

/* ===============================
  UI
=============================== */
function SectionHeader({ title, desc, right = null }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <span className="w-1.5 self-stretch rounded-full bg-slate-300/70 shrink-0" />

          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-5 text-slate-900 truncate">
              {title}
            </div>
            {desc ? (
              <div className="mt-0.5 text-[11px] leading-4 text-slate-500 truncate">
                {desc}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/* ===============================
  main
=============================== */
export default function LatestSimulationRow() {
  const token = useToken((s) => s.token);

  const [scheduleList, setScheduleList] = useState([]);
  const [latestSim, setLatestSim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [moreOpen, setMoreOpen] = useState(false);
  const [moreKey, setMoreKey] = useState(0);

  const TOP_N = 10;

  useEffect(() => {
    let alive = true;

    const fetchLatest = async () => {
      if (!token) return;

      setLoading(true);
      setErr("");

      try {
        const simJson = await getSimulations(token);

        // ✅ 콘솔로 키 확인하고 싶으면 주석 해제
        // console.log("[SIM LIST KEYS]", Object.keys(simJson || {}), simJson);

        const simList = normalizeSimulationList(simJson);
        const latest = pickLatestSim(simList);

        if (!alive) return;
        setLatestSim(latest);

        const latestId = String(getId(latest) || "");
        if (!latestId) {
          setScheduleList([]);
          setErr("시뮬레이션이 없습니다.");
          return;
        }

        const res = await getSimulationSchedule(latestId, token);
        if (!alive) return;

        setScheduleList(normalizeScheduleList(res));
      } catch (e) {
        if (!alive) return;
        console.error("[DASH][LATEST_SIM] failed:", e);
        setErr(e?.message || "조회 실패");
        setScheduleList([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    fetchLatest();

    return () => {
      alive = false;
    };
  }, [token]);

  const meta = latestSim
    ? {
        id: getId(latestSim),
        title: latestSim?.title ?? latestSim?.simulationTitle ?? "",
        description: latestSim?.description ?? latestSim?.desc ?? "",
        simulationStartDate:
          latestSim?.simulationStartDate ?? latestSim?.startDate ?? "",
      }
    : null;

  // ✅ 공정/작업량 rows (전체)
  const rowsAll = useMemo(() => {
    const list = Array.isArray(scheduleList) ? scheduleList : [];
    const map = new Map();

    for (const s of list) {
      const startRaw = s?.startAt ?? s?.start ?? s?.startTime;
      const endRaw = s?.endAt ?? s?.end ?? s?.endTime;

      const item = {
        ...s,
        startAt: startRaw ?? s?.startAt,
        endAt: endRaw ?? s?.endAt,
      };

      if (!taskHasBarLikeScheduleItem(item)) continue;

      const opLabel =
        safeText(s?.operationName) ||
        safeText(s?.operation) ||
        safeText(s?.opName) ||
        "공정";

      const key = String(s?.operationId ?? s?.opId ?? opLabel);
      map.set(key, {
        key,
        label: opLabel,
        value: (map.get(key)?.value || 0) + 1,
      });
    }

    const palette = [
      { dot: "bg-indigo-500/80", bar: "bg-indigo-500/70" },
      { dot: "bg-indigo-400/70", bar: "bg-indigo-400/60" },
      { dot: "bg-slate-500/60", bar: "bg-slate-500/55" },
      { dot: "bg-slate-400/60", bar: "bg-slate-400/55" },
    ];

    const arr = Array.from(map.values())
      .filter((r) => Number(r.value || 0) > 0)
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

    return arr.map((r, i) => {
      const p = palette[i % palette.length];
      return { ...r, dotClass: p.dot, barClass: p.bar };
    });
  }, [scheduleList]);

  const rowsTop = useMemo(() => rowsAll.slice(0, TOP_N), [rowsAll]);
  const rowsRest = useMemo(() => rowsAll.slice(TOP_N), [rowsAll]);

  const machineGroups = useMemo(
    () => buildGroupsByMachine(scheduleList),
    [scheduleList],
  );

  if (loading) {
    return (
      <div className="h-full grid place-items-center text-[12px] text-slate-500">
        불러오는 중...
      </div>
    );
  }

  if (err) {
    return (
      <div className="h-full grid place-items-center text-[12px] text-rose-600">
        {err}
      </div>
    );
  }

  return (
    <div className="grid min-h-0 gap-5 md:grid-cols-[1fr_2fr_1fr] md:h-[380px]">
      {/* (1) 시뮬레이션 정보 */}
      <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex flex-col">
        <SectionHeader title="시뮬레이션 정보" desc="최신 실행 요약" />

        <div className="flex-1 min-h-0 px-3.5 pb-3">
          <div className="h-full min-h-0 p-3">
            <LeftMeta meta={meta} />
          </div>
        </div>
      </section>

      {/* (2) 공정/작업량 */}
      <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex flex-col">
        <SectionHeader
          title="공정 · 작업량"
          desc="작업 분포"
          right={
            rowsAll.length > TOP_N ? (
              <Popover
                open={moreOpen}
                onOpenChange={(v) => {
                  setMoreOpen(v);
                  if (v) setMoreKey((k) => k + 1);
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-slate-500 hover:text-indigo-700"
                  >
                    더보기
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  side="right"
                  sideOffset={12}
                  className="w-[520px] max-w-[calc(100vw-32px)] rounded-2xl border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-slate-900 truncate">
                        공정 · 작업량 전체
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        총 {rowsAll.length}개
                      </div>
                    </div>
                  </div>

                  <div key={moreKey} className="pop-slide-in-x">
                    <div className="pretty-scroll h-[320px] overflow-auto bg-white">
                      <div className="min-h-[320px] grid grid-cols-[35%_65%] gap-x-2 px-2 py-2">
                        <div className="min-w-0 overflow-hidden pr-1">
                          <div className="space-y-1">
                            {rowsAll.map((r) => (
                              <div
                                key={r.key}
                                className="group flex items-center gap-1.5 rounded-md px-1.5 hover:bg-slate-50/80"
                                style={{ height: 20 }}
                                title={r.label}
                              >
                                <span
                                  className={[
                                    "h-1.5 w-1.5 rounded-full",
                                    r.dotClass,
                                  ].join(" ")}
                                />
                                <div className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 group-hover:text-slate-900">
                                  {safeText(r.label) || "공정"}
                                </div>
                                <div className="shrink-0 text-[11px] font-semibold text-slate-500 tabular-nums">
                                  {r.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="min-w-0 overflow-hidden">
                          <RightBars rows={rowsAll} rowH={20} barH={10} />
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null
          }
        />

        <div className="flex-1 min-h-0 px-3.5 pb-3">
          <div className="h-full min-h-0">
            <div className="h-full min-h-0 grid grid-cols-[19%_81%] gap-x-1 px-2 py-2">
              <div className="min-w-0 min-h-0 overflow-hidden">
                <div className="space-y-1">
                  {rowsTop.map((r) => (
                    <div
                      key={r.key}
                      className="group flex items-center gap-1.5 rounded-md px-1.5 hover:bg-slate-50/80"
                      style={{ height: 18 }}
                      title={r.label}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          r.dotClass,
                        ].join(" ")}
                      />
                      <div className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 group-hover:text-slate-900">
                        {safeText(r.label) || "공정"}
                      </div>
                    </div>
                  ))}
                </div>

                {rowsRest.length > 0 ? (
                  <div className="pt-2">
                    <div className="text-[10px] text-slate-400 px-1.5 truncate">
                      외 {rowsRest.length}개 더 있음
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 min-h-0 overflow-hidden">
                <RightBars rows={rowsTop} rowH={18} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* (3) 기계 원형 그래프 */}
      <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex flex-col">
        <SectionHeader title="기계 분포" desc="작업시간 기준" />

        <div className="flex-1 min-h-0 px-3.5 pb-3">
          <div className="h-full min-h-0">
            <MachineDonut
              groups={machineGroups}
              hideHeader={true}
              noFrame={true}
              size={230}
              thickness={50}
              spinOnce={true}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
