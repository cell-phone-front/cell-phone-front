// pages/dashboard/index.js
import DashboardShell from "@/components/dashboard-shell";
import { DashboardCalendar } from "@/components/dashboard/calendar";
import DashboardNotice from "@/components/dashboard/notice";
import { useAccount } from "@/stores/account-store";
import { useMemo, useState } from "react";
import LatestSimulationRow from "@/components/dashboard/latest-simulation-row";
import WorkerDashboardRow from "@/components/dashboard/worker-row";

function CardHeader({ title, desc, badge, badgeClass = "", right = null }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          {/* ✅ 쭉 긴 선 */}
          <span className="w-1.5 self-stretch rounded-full bg-slate-300/70 shrink-0" />

          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-5 text-slate-900">
              {title}
            </div>
            {desc ? (
              <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
                {desc}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {right ? (
        <div className="shrink-0">{right}</div>
      ) : badge ? (
        <span
          className={[
            "mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
            badgeClass || "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function MyInfoCard() {
  const account = useAccount((s) => s.account);

  const roleLabel = useMemo(() => {
    const r = String(account?.role || "").toUpperCase();
    if (!r) return "-";
    return r;
  }, [account?.role]);

  const name = account?.name || account?.memberName || account?.username || "-";
  const dept = account?.department || account?.dept || "-";
  const email = account?.email || "-";

  const roleTone =
    roleLabel === "ADMIN"
      ? "bg-red-50 text-red-700 border-red-200"
      : roleLabel === "PLANNER"
        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <CardHeader
        title="내 정보"
        desc="계정/권한 요약"
        badge={roleLabel}
        badgeClass={roleTone}
      />

      <div className="min-h-0 h-full px-4 pb-4">
        <div className="h-full min-h-0 overflow-auto pr-1">
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="flex items-center gap-5 px-4 py-4">
                <div className="text-[11px] font-medium text-slate-500">
                  이름
                </div>
                <div className="text-[12px] font-semibold text-slate-900 truncate">
                  {name}
                </div>
              </div>

              <div className="flex items-center gap-5 px-4 py-4">
                <div className="text-[11px] font-medium text-slate-500">
                  권한
                </div>
                <div className="text-[12px] font-semibold text-slate-900 truncate">
                  {roleLabel}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 px-4 py-4">
              <div className="text-[11px] font-medium text-slate-500">부서</div>
              <div className="text-[13px] font-semibold text-slate-900 truncate">
                {dept}
              </div>
            </div>

            <div className="flex items-center gap-5 px-4 py-4">
              <div className="text-[11px] font-medium text-slate-500">
                이메일
              </div>
              <div className="text-[12px] font-medium text-slate-700 break-all">
                {email}
              </div>
            </div>

            <button
              type="button"
              onClick={() => (window.location.href = "/work")}
              className="
                w-full text-left
                bg-slate-50 px-4 py-5
                hover:bg-slate-100 active:bg-slate-200
                transition rounded-b-2xl
              "
              title="내 근무로 이동"
            >
              <div className="text-[11px] font-medium text-slate-500">오늘</div>
              <div className="mt-1 text-[12px] font-semibold text-slate-900">
                작업/스케줄을 확인해 주세요.
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                (클릭하면 내 근무로 이동합니다)
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  const account = useAccount((s) => s.account);

  const role = useMemo(
    () => String(account?.role || "").toUpperCase(),
    [account?.role],
  );
  const isAdminOrPlanner = role === "ADMIN" || role === "PLANNER";
  const isWorker = role === "WORKER";

  const [calMonth, setCalMonth] = useState(() => new Date());
  const calMonthLabel = `${calMonth.getFullYear()}.${String(
    calMonth.getMonth() + 1,
  ).padStart(2, "0")}`;

  const calGoPrev = () =>
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const calGoNext = () =>
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const calGoToday = () => setCalMonth(new Date());

  const [noticeCount, setNoticeCount] = useState(0);

  return (
    <DashboardShell crumbTop="메인 " crumbCurrent="대시보드">
      <div className="h-full min-h-0 px-3 py-10">
        <div className="mx-auto flex h-full min-h-0 max-w-8xl flex-col gap-5">
          <div className="grid min-h-0 gap-5 md:grid-cols-3 md:auto-rows-[340px]">
            {/* Calendar */}
            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <CardHeader
                title="캘린더"
                desc="근무/스케줄 요약"
                right={
                  <div className="flex items-center gap-3">
                    <button
                      onClick={calGoToday}
                      className="ml-2 text-[11px] text-slate-400 hover:text-slate-700 transition"
                    >
                      today
                    </button>

                    <button
                      onClick={calGoPrev}
                      aria-label="prev month"
                      className="
                        h-8 w-8 flex items-center justify-center rounded-lg
                        text-[18px] font-semibold text-slate-500 transition
                        hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200
                      "
                    >
                      ‹
                    </button>

                    <div className="text-[15px] font-semibold tracking-tight text-slate-900 min-w-[90px] text-center">
                      {calMonthLabel}
                    </div>

                    <button
                      onClick={calGoNext}
                      aria-label="next month"
                      className="
                        h-8 w-8 flex items-center justify-center rounded-lg
                        text-[18px] font-semibold text-slate-500 transition
                        hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200
                      "
                    >
                      ›
                    </button>
                  </div>
                }
              />

              <div className="min-h-0 h-full">
                <div className="h-[calc(100%-1px)] min-h-0 p-1.5">
                  <div className="h-full min-h-0 overflow-hidden rounded-2xl">
                    <DashboardCalendar
                      month={calMonth}
                      onMonthChange={setCalMonth}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ✅ Notice (기존 위쪽 공지 블록 제거하고, DashboardNotice로 통일) */}
            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex flex-col">
              <CardHeader
                title="공지"
                desc="중요 알림/공지사항"
                right={
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      {noticeCount}건
                    </span>

                    <button
                      type="button"
                      onClick={() => (window.location.href = "/notice")}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-indigo-700 transition"
                      title="공지사항 전체 보기"
                    >
                      전체 보기{" "}
                      <span className="text-[12px] leading-none">›</span>
                    </button>
                  </div>
                }
              />

              <div className="flex-1 min-h-0 p-0">
                <div className="h-full min-h-0 overflow-hidden">
                  <DashboardNotice
                    onCountChange={setNoticeCount}
                    onGoNotice={() => (window.location.href = "/notice")}
                  />
                </div>
              </div>
            </section>

            {/* MyInfo */}
            <MyInfoCard />
          </div>

          {/* ✅ Role 기반 하단 Row */}
          <section className="min-h-0 flex-1 overflow-visible">
            <div className="min-h-0 h-full relative">
              {/* 실제 컨텐츠 */}
              <div
                className={[
                  "min-h-0 h-full transition-all duration-200",
                  isWorker
                    ? "blur-md opacity-40 select-none pointer-events-none"
                    : "",
                ].join(" ")}
                aria-hidden={isWorker ? "true" : "false"}
              >
                <LatestSimulationRow />
              </div>

              {/* WORKER 전용 블러 오버레이 */}
              {isWorker && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm rounded-2xl">
                  <div className="mx-4 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 shadow-lg ring-1 ring-black/5">
                    <div className="text-[14px] font-semibold text-slate-900">
                      사용자 권한이 아닙니다.
                    </div>

                    <div className="mt-1 text-[12px] leading-5 text-slate-600">
                      현재 계정(WORKER)은 이 기능을 사용할 수 없습니다.
                      <br />
                      관리자 또는 플래너 권한이 필요합니다.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
