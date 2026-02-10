// pages/dashboard/index.js
import DashboardShell from "@/components/dashboard-shell";
import { DashboardCalendar } from "@/components/dashboard/calendar";
import DashboardProducts from "@/components/dashboard/products";
import DashboardNotice from "@/components/dashboard/notice";

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
            "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
            badgeClass || "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export default function Page() {
  return (
    <DashboardShell crumbTop="스케줄" crumbCurrent="대시보드">
      <div className="h-full min-h-0 px-6 py-3">
        <div className="mx-auto flex h-full min-h-0 max-w-8xl flex-col gap-5">
          {/* ✅ 상단 3카드: 더 작게 (340px) */}
          <div className="grid min-h-0 gap-5 md:grid-cols-3 md:auto-rows-[340px]">
            {/* Calendar */}
            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <CardHeader
                title="캘린더"
                desc="근무/스케줄 요약"
                badge="Today"
              />
              <div className="h-px bg-slate-100/70" />

              <div className="min-h-0 h-full">
                {/* ✅ padding도 줄임 */}
                <div className="h-[calc(100%-1px)] min-h-0 p-1.5">
                  <div className="h-full min-h-0 overflow-hidden rounded-2xl">
                    <DashboardCalendar />
                  </div>
                </div>
              </div>
            </section>

            {/* Products */}
            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <CardHeader
                title="생산대상"
                desc="제품/수량 현황"
                badge="Updated"
                badgeClass="bg-indigo-50 text-indigo-700"
              />
              <div className="h-px bg-slate-100/70" />

              <div className="min-h-0 h-full p-1.5">
                <div className="h-full min-h-0 overflow-hidden rounded-2xl">
                  <DashboardProducts />
                </div>
              </div>
            </section>

            {/* Summary */}
            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <CardHeader title="오늘 요약" desc="진행/대기/지연" />
              <div className="h-px bg-slate-100/70" />

              <div className="min-h-0 h-full p-3">
                <div className="h-full min-h-0 overflow-auto pr-1">
                  <div className="grid gap-2.5">
                    {/* ✅ 카드도 조금 더 컴팩트 */}
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-[11px] font-medium text-slate-500">
                        진행
                      </div>
                      <div className="mt-1 flex items-end justify-between">
                        <div className="text-[22px] font-semibold leading-none text-slate-900">
                          12
                        </div>
                        <div className="text-[11px] font-medium text-indigo-700">
                          +2
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-[11px] font-medium text-slate-500">
                        대기
                      </div>
                      <div className="mt-1 flex items-end justify-between">
                        <div className="text-[22px] font-semibold leading-none text-slate-900">
                          7
                        </div>
                        <div className="text-[11px] font-medium text-slate-600">
                          -
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-[11px] font-medium text-slate-500">
                        지연
                      </div>
                      <div className="mt-1 flex items-end justify-between">
                        <div className="text-[22px] font-semibold leading-none text-slate-900">
                          1
                        </div>
                        <div className="text-[11px] font-medium text-rose-700">
                          Check
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ✅ 하단 카드도 전체적으로 타이트하게 */}
          <section className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="flex items-start justify-between px-4 py-2.5">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-5 text-slate-900">
                  전체 현황
                </div>
                <div className="text-[11px] leading-4 text-slate-500">
                  라인/설비/작업 흐름 모니터링
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="h-8 rounded-xl bg-slate-100 px-3 text-[12px] font-medium text-slate-800 hover:bg-slate-200 active:bg-slate-300">
                  필터
                </button>
                <button className="h-8 rounded-xl bg-indigo-600 px-3 text-[12px] font-medium text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800">
                  리포트
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-100/70" />

            <div className="min-h-0 h-full p-3.5">
              <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[380px_1fr]">
                <div className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  <DashboardNotice />
                </div>

                <div className="min-h-0 overflow-hidden rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">
                    여기에 차트/간트/테이블을 배치하시면 됩니다.
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    (상단 3카드는 작게, 내용은 내부 스크롤로 처리)
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
