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
   * ✅ 핵심: 간트가 계산에 쓰는 시간 필드를 Date로 보장
   * - start/end/startTime/endTime을 문자열로 두면 (end-start) 계산이 깨져서 바가 1~2px로 나올 수 있습니다.
   * - 그래서 여기서 Date 객체로 확정해 둡니다.
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

          // 원본 문자열은 유지 (디버깅/표시용)
          startAt: startRaw ?? s?.startAt,
          endAt: endRaw ?? s?.endAt,

          // ✅ 간트 계산용은 Date로
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

  // ✅ 3단 groups
  const productGroups = useMemo(() => {
    return buildGroupsByProductOperation(ganttList);
  }, [ganttList]);

  // ✅ 2단 groups
  const machineGroups = useMemo(() => {
    return buildGroupsByMachine(ganttList);
  }, [ganttList]);

  // ✅ 상단 요약 (Total / Products / Machines)
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

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-[13px] font-extrabold text-slate-800">
              로딩 중...
            </div>
            <div className="mt-2 text-[12px] font-semibold text-slate-500">
              시뮬레이션 스케줄을 불러오고 있습니다.
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (err) {
    return (
      <DashboardShell>
        <div className="p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="text-[13px] font-extrabold text-red-700">{err}</div>
            <button
              type="button"
              onClick={fetchData}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12px] font-extrabold text-slate-700 border border-red-200 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-3 h-[calc(100vh-120px)] min-h-0 flex flex-col gap-3">
        {/* ===== 상단 헤더 (슬림 바) ===== */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* 왼쪽 */}
            <div className="flex items-center gap-4 min-w-0">
              {/* 아이콘 */}
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                {tab === "PRODUCT" ? (
                  <Boxes className="h-5 w-5" />
                ) : (
                  <Cpu className="h-5 w-5" />
                )}
              </div>

              {/* 타이틀 */}
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-slate-900 truncate">
                  시뮬레이션 간트
                  <span className="ml-2 text-[12px] text-slate-400">#{id}</span>
                </div>

                <div className="text-[11px] text-slate-500">
                  {tab === "PRODUCT"
                    ? "Product → Operation → Task"
                    : "Machine → Task"}
                </div>
              </div>

              {/* 탭 */}
              <div className="ml-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setTab("PRODUCT")}
                  className={cx(
                    "px-5 py-1.5 rounded-md text-[11px] font-semibold",
                    tab === "PRODUCT"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-white",
                  )}
                >
                  Product
                </button>

                <button
                  onClick={() => setTab("MACHINE")}
                  className={cx(
                    "px-5 py-1.5 rounded-md text-[11px] font-semibold",
                    tab === "MACHINE"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-white",
                  )}
                >
                  Machine
                </button>
              </div>
              {/* AI */}
              <button
                onClick={() => setAiOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-[11px] font-semibold hover:bg-slate-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Summary
                {aiBadgeCount > 0 && (
                  <span className="ml-1 rounded bg-indigo-100 px-1.5 text-indigo-700">
                    {aiBadgeCount}
                  </span>
                )}
              </button>
            </div>

            {/* 오른쪽 */}
            <div className="flex items-center gap-2 shrink-0">
              {/* 요약 */}
              <div className="hidden sm:flex items-center gap-2 text-[12px] font-semibold text-slate-600">
                <span>
                  Tasks{" "}
                  <span className="font-bold text-slate-900">
                    {summary.total}
                  </span>
                </span>

                <span className="text-slate-300">|</span>

                <span>
                  Products{" "}
                  <span className="font-bold text-slate-900">
                    {summary.productCount}
                  </span>
                </span>

                <span className="text-slate-300">|</span>

                <span>
                  Machines{" "}
                  <span className="font-bold text-slate-900">
                    {summary.machineCount}
                  </span>
                </span>
              </div>

              {/* 새로고침 */}
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* ===== 보드 카드 ===== */}
        <div className="flex-1 min-h-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="h-full min-h-0 p-2">
            {tab === "PRODUCT" ? (
              productGroups.length ? (
                <GanttBoard groups={productGroups} />
              ) : (
                <div className="h-full grid place-items-center text-sm text-slate-400">
                  표시할 그룹이 없습니다. (시간 필드/파싱 확인)
                </div>
              )
            ) : machineGroups.length ? (
              <GanttBoardMachine groups={machineGroups} />
            ) : (
              <div className="h-full grid place-items-center text-sm text-slate-400">
                표시할 그룹이 없습니다. (시간 필드/파싱 확인)
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
