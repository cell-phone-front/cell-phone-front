// src/pages/simulation/[id]/gantt.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { RefreshCw, Boxes, Cpu, Sparkles } from "lucide-react";

import { useToken } from "@/stores/account-store";
import { getSimulationSchedule } from "@/api/simulation-api";

import DashboardShell from "@/components/dashboard-shell";

// ✅ 3단 (Product → Operation → Task)
import GanttBoard from "@/components/gantt/gantt-board";
import { buildGroupsByProductOperation } from "@/components/gantt/gantt-groups";

// ✅ 2단 (Machine → Task)
import GanttBoardMachine from "@/components/gantt/gantt-board-machine";
import { buildGroupsByMachine } from "@/components/gantt/gantt-groups-machine";

// ✅ aiSummary modal
import AiSummaryModal from "@/components/simulation/AiSummaryModal";

/* ===============================
  util
=============================== */
function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

// timezone 없는 "YYYY-MM-DDTHH:mm:ss" 문자열을 안전하게 보정(+09:00 붙이기)
function ensureKST(isoLike) {
  if (!isoLike) return "";
  const s = String(isoLike).trim();
  const hasTZ = /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
  return hasTZ ? s : `${s}+09:00`;
}

function StatCard({ label, value, sub, tone = "slate", icon }) {
  const toneMap = {
    slate: "text-slate-900",
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-black/5">
      <div className="text-[10px] font-medium text-slate-500">{label}</div>

      {icon ? (
        <div className="absolute right-4 top-4 h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
          {icon}
        </div>
      ) : null}

      <div
        className={cx(
          "mt-1 text-[22px] font-semibold leading-tight",
          toneMap[tone] || toneMap.slate,
        )}
      >
        {value}
      </div>

      {sub ? (
        <div className="mt-0.5 text-[10px] leading-tight text-slate-500">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function SegTab({ value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex-1 px-6 py-2 rounded-full text-[11px] font-semibold transition text-center whitespace-nowrap",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white text-slate-600 hover:bg-slate-100",
      )}
    >
      {value}
    </button>
  );
}

function TopActionButton({ onClick, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "h-10 rounded-full px-4",
        "inline-flex items-center justify-center gap-2",
        "text-[11px] font-semibold transition",
        disabled
          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          : "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

export default function SimulationGanttPage() {
  const token = useToken((s) => s.token);
  const router = useRouter();
  const { id } = router.query;

  const [scheduleList, setScheduleList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [tab, setTab] = useState("PRODUCT"); // PRODUCT | MACHINE
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  const fetchData = () => {
    if (!token || !id) return;

    setLoading(true);
    setErr("");

    getSimulationSchedule(id, token)
      .then((res) => {
        setScheduleList(res?.scheduleList ?? []);
        setAiSummary(res?.aiSummary ?? "");
      })
      .catch((e) => setErr(e?.message || "조회 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  /**
   *  간트가 계산에 쓰는 시간 필드를 Date로 보장
   */
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
      .filter((s) => {
        if (!(s.start instanceof Date) || !(s.end instanceof Date))
          return false;
        const a = s.start.getTime();
        const b = s.end.getTime();
        return !isNaN(a) && !isNaN(b) && b - a >= 60 * 1000;
      });
  }, [scheduleList]);

  const productGroups = useMemo(() => {
    return buildGroupsByProductOperation(ganttList);
  }, [ganttList]);

  const machineGroups = useMemo(() => {
    return buildGroupsByMachine(ganttList);
  }, [ganttList]);

  const summary = useMemo(() => {
    const list = Array.isArray(scheduleList) ? scheduleList : [];
    const products = new Set();
    const machines = new Set();

    for (const s of list) {
      if (s?.productName) products.add(String(s.productName));
      if (s?.machineId) machines.add(String(s.machineId));
    }

    return {
      total: list.length,
      productCount: products.size,
      machineCount: machines.size,
    };
  }, [scheduleList]);

  const aiBadgeCount = useMemo(() => {
    return String(aiSummary || "").trim() ? 1 : 0;
  }, [aiSummary]);

  // ===== Loading / Error (UI만 예쁘게) =====
  if (loading) {
    return (
      <DashboardShell crumbTop="시뮬레이션" crumbCurrent="gantt">
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-black/5">
            <div className="text-[13px] font-semibold text-slate-800">
              로딩 중...
            </div>
            <div className="mt-2 text-[12px] text-slate-500">
              시뮬레이션 스케줄을 불러오고 있습니다.
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (err) {
    return (
      <DashboardShell crumbTop="시뮬레이션" crumbCurrent="gantt">
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm ring-black/5">
            <div className="text-[13px] font-semibold text-rose-700">{err}</div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={fetchData}
                className="
                  h-10 rounded-full px-4
                  inline-flex items-center gap-2
                  border border-rose-200 bg-white
                  text-[12px] font-semibold text-slate-800
                  hover:bg-rose-50 transition
                "
              >
                <RefreshCw className="h-4 w-4" />
                다시 시도
              </button>

              <button
                type="button"
                onClick={() => router.push("/simulation")}
                className="
                  h-10 rounded-full px-4
                  inline-flex items-center gap-2
                  border border-slate-200 bg-white
                  text-[12px] font-semibold text-slate-700
                  hover:bg-slate-50 transition
                "
              >
                목록으로
              </button>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const showGroups = tab === "PRODUCT" ? productGroups : machineGroups;
  const hasGroups = Array.isArray(showGroups) && showGroups.length > 0;

  return (
    <DashboardShell crumbTop="시뮬레이션" crumbCurrent="gantt">
      {/* 스크롤/높이 */}
      <div className="p-3 h-[calc(100vh-120px)] min-h-0 flex flex-col gap-3">
        {/* ===== 상단 타이틀 ===== */}
        <div className="shrink-0">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  {tab === "PRODUCT" ? (
                    <Boxes className="h-5 w-5" />
                  ) : (
                    <Cpu className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="text-[26px] font-semibold tracking-tight text-slate-900 leading-tight">
                    시뮬레이션 간트
                    <span className="ml-2 text-[12px] text-slate-400">
                      #{id}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {tab === "PRODUCT"
                      ? "Product → Operation → Task"
                      : "Machine → Task"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <TopActionButton onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
                새로고침
              </TopActionButton>

              <button
                type="button"
                onClick={() => setAiOpen(true)}
                className="
                  h-10 rounded-full px-4
                  inline-flex items-center justify-center gap-2
                  bg-indigo-900 text-white
                  text-[11px] font-semibold
                  transition hover:bg-indigo-800 active:bg-indigo-950
                  active:scale-[0.98]
                  focus:outline-none focus:ring-2 focus:ring-indigo-300
                "
              >
                <Sparkles className="h-4 w-4" />
                AI Summary
                {aiBadgeCount > 0 ? (
                  <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                    {aiBadgeCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {/* ===== KPI + 보기모드 ===== */}

          <div className="mt-4 grid grid-cols-12 gap-3">
            <div className="col-span-12 xl:col-span-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-black/5 h-full flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-[10px] font-medium text-slate-500">
                    보기 모드
                  </div>
                  <span className="items-center text-[10px] text-slate-400">
                    view
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                  <SegTab
                    value="Product"
                    active={tab === "PRODUCT"}
                    onClick={() => setTab("PRODUCT")}
                  />
                  <SegTab
                    value="Machine"
                    active={tab === "MACHINE"}
                    onClick={() => setTab("MACHINE")}
                  />
                </div>
              </div>
            </div>
            <div className="col-span-12 xl:col-span-8 grid grid-cols-3 gap-3">
              <StatCard
                label="총 작업(Task)"
                value={summary.total.toLocaleString()}
                sub="scheduleList 기준"
                tone="slate"
                icon={<span className="text-[10px] font-semibold">T</span>}
              />
              <StatCard
                label="제품(Product)"
                value={summary.productCount.toLocaleString()}
                sub="중복 제거"
                tone="indigo"
                icon={<Boxes className="h-4 w-4" />}
              />
              <StatCard
                label="기계(Machine)"
                value={summary.machineCount.toLocaleString()}
                sub="중복 제거"
                tone="slate"
                icon={<Cpu className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>

        {/* ===== 보드 카드 (스크롤/높이 그대로) ===== */}
        <div className="flex-1 min-h-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="h-full min-h-0 p-2">
            {hasGroups ? (
              tab === "PRODUCT" ? (
                <GanttBoard groups={productGroups} />
              ) : (
                <GanttBoardMachine groups={machineGroups} />
              )
            ) : (
              <div className="h-full grid place-items-center px-6">
                <div className="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="text-[13px] font-semibold text-indigo-700">
                    표시할 그룹이 없습니다.
                  </div>
                  <div className="mt-2 text-[12px] text-slate-500 leading-5">
                    시간 필드 파싱 결과가 유효하지 않거나(시작/끝),
                    <br />
                    1분 미만 작업은 필터링되어 제외될 수 있습니다.
                  </div>

                  <div className="mt-4 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={fetchData}
                      className="
                        h-10 rounded-full px-4
                        inline-flex items-center gap-2
                        border border-slate-200 bg-white
                        text-[12px] font-semibold text-slate-700
                        hover:bg-slate-50 transition
                      "
                    >
                      <RefreshCw className="h-4 w-4" />
                      새로고침
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/simulation")}
                      className="
                        h-10 rounded-full px-4
                        inline-flex items-center gap-2
                        bg-indigo-900 text-white
                        text-[12px] font-semibold
                        hover:bg-indigo-800 active:bg-indigo-950 transition
                        active:scale-[0.98]
                      "
                    >
                      목록으로
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ AI Summary 모달 */}
      <AiSummaryModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title={`AI Summary · #${id}`}
        summary={aiSummary}
      />
    </DashboardShell>
  );
}
