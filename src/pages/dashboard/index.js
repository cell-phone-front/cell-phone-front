// pages/dashboard/index.js
import { useMemo } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { DashboardCalendar } from "@/components/dashboard/calendar";
import DashboardNotice from "@/components/dashboard/notice";
import { useAccount } from "@/stores/account-store";
import DashboardGantt from "@/components/dashboard/gantt";

function CardHeader({ title, desc, badge, badgeClass = "" }) {
  return (
    <div className="flex items-start justify-between px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold leading-5 text-slate-900">
          {title}
        </div>
        {desc ? (
          <div className="text-[11px] leading-4 text-slate-500">{desc}</div>
        ) : null}
      </div>

      {badge ? (
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
      <div className="h-px bg-slate-100/70" />

      <div className="min-h-0 h-full p-3">
        <div className="h-full min-h-0 overflow-auto pr-1">
          <div className="grid gap-2.5">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-medium text-slate-500">이름</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-900">
                {name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-medium text-slate-500">
                  부서
                </div>
                <div className="mt-1 text-[12px] font-semibold text-slate-900 truncate">
                  {dept}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-medium text-slate-500">
                  권한
                </div>
                <div className="mt-1 text-[12px] font-semibold text-slate-900">
                  {roleLabel}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-medium text-slate-500">
                이메일
              </div>
              <div className="mt-1 text-[12px] font-medium text-slate-700 truncate">
                {email}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-medium text-slate-500">오늘</div>
              <div className="mt-1 text-[12px] font-semibold text-slate-900">
                작업/스케줄을 확인해 주세요.
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                (우측 하단 간트에서 전체 흐름을 확인하실 수 있어요)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <DashboardShell crumbTop="스케줄" crumbCurrent="대시보드">
      <div className="h-full min-h-0 px-6 py-3">
        <div className="mx-auto flex h-full min-h-0 max-w-8xl flex-col gap-5">
          <div className="grid min-h-0 gap-5 md:grid-cols-3 md:auto-rows-[340px]">
            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <CardHeader
                title="캘린더"
                desc="근무/스케줄 요약"
                badge="Today"
              />
              <div className="h-px bg-slate-100/70" />
              <div className="min-h-0 h-full">
                <div className="h-[calc(100%-1px)] min-h-0 p-1.5">
                  <div className="h-full min-h-0 overflow-hidden rounded-2xl">
                    <DashboardCalendar />
                  </div>
                </div>
              </div>
            </section>

            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <CardHeader
                title="공지"
                desc="중요 알림/공지사항"
                badge="New"
                badgeClass="bg-indigo-50 text-indigo-700"
              />
              <div className="h-px bg-slate-100/70" />
              <div className="min-h-0 h-full p-1.5">
                <div className="h-full min-h-0 overflow-hidden rounded-2xl">
                  <DashboardNotice />
                </div>
              </div>
            </section>

            <MyInfoCard />
          </div>

          <section className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {/* ✅ 타이틀은 바깥(헤더)처럼 */}
            <div className="px-4 pt-3">
              <div className="text-[13px] font-semibold leading-5 text-slate-900">
                최신 시뮬레이션
              </div>
            </div>

            {/* ✅ 안쪽 라운드/링 제거 + 패딩만 정리 */}
            <div className="min-h-0 h-full px-3.5 py-3">
              <div className="h-full min-h-0 overflow-hidden bg-white">
                <DashboardGantt />
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
