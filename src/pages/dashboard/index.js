import DashboardShell from "@/components/dashboard-shell";
import { DashboardCalendar } from "@/components/dashboard/calendar";
import DashboardProducts from "@/components/dashboard/products";
import DashboardNotice from "@/components/dashboard/notice";

export default function Page() {
  return (
    <DashboardShell crumbTop="스케줄" crumbCurrent="대시보드">
      {/* 전체 배경: 밝은 회색 + 여백 */}
      <div className="h-full min-h-0 px-6 py-3">
        <div className="mx-auto flex h-full min-h-0 max-w-8xl flex-col gap-6">
          {/* 헤더 */}
          {/* <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                대시보드
              </div>
              <div className="mt-1 text-sm text-slate-500">
                오늘 일정과 생산/현황을 한눈에 확인하세요.
              </div>
            </div> */}

          {/* <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                LIVE
              </span>
              <button className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-black/5 hover:bg-white/70 active:bg-slate-50">
                새로고침
              </button>
            </div> */}
          {/* </div> */}

          {/* 상단 3카드 */}
          <div className="grid min-h-0 gap-6 md:grid-cols-3">
            {/* 카드 공통: border 대신 shadow + ring(아주 연한) */}
            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-black/5">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    캘린더
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    근무/스케줄 요약
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Today
                </span>
              </div>
              <div className="h-px bg-slate-100" />
              {/* 패딩2 */}
              <div className="min-h-0 p-2">
                <DashboardCalendar />
              </div>
            </section>

            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-black/5">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    생산대상
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    제품/수량 현황
                  </div>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  Updated
                </span>
              </div>
              <div className="h-px bg-slate-100" />
              {/* 패딩2 */}
              <div className="min-h-0 p-2">
                <DashboardProducts />
              </div>
            </section>

            {/* 요약 카드 (예시) */}
            <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-black/5">
              <div className="px-5 py-4">
                <div className="text-sm font-semibold text-slate-900">
                  오늘 요약
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  진행/대기/지연
                </div>
              </div>
              <div className="h-px bg-slate-100" />

              <div className="grid gap-3 p-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500">진행</div>
                  <div className="mt-1 flex items-end justify-between">
                    <div className="text-2xl font-semibold text-slate-900">
                      12
                    </div>
                    <div className="text-xs font-medium text-indigo-700">
                      +2
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500">대기</div>
                  <div className="mt-1 flex items-end justify-between">
                    <div className="text-2xl font-semibold text-slate-900">
                      7
                    </div>
                    <div className="text-xs font-medium text-slate-600">-</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-500">지연</div>
                  <div className="mt-1 flex items-end justify-between">
                    <div className="text-2xl font-semibold text-slate-900">
                      1
                    </div>
                    <div className="text-xs font-medium text-rose-700">
                      Check
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 하단 큰 카드 */}
          <section className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-sm  ring-black/5">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  전체 현황
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  라인/설비/작업 흐름 모니터링
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200 active:bg-slate-300">
                  필터
                </button>
                <button className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800">
                  리포트
                </button>
              </div>
            </div>
            <div className="h-px bg-slate-100" />

            {/* 내용 자리(차트/테이블/간트 등 넣기) */}
            <div className="min-h-0 p-4">
              <div className="h-full min-h-[280px] rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-700">
                  여기에 차트/테이블/요약 위젯을 배치하시면 됩니다.
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  (border 대신 배경 + 그림자 톤으로 통일)
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
