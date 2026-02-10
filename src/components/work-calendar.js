"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPersonalSchedule } from "@/api/simulation-api";
import { useToken } from "@/stores/account-store";

function ymdLocal(d) {
  if (!(d instanceof Date)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeShift(v) {
  const s = String(v || "")
    .trim()
    .toUpperCase();
  if (s === "E") return "D";
  if (s === "D") return "D";
  if (s === "S") return "S";
  if (s === "N") return "N";
  if (s === "OFF" || s === "H" || s === "휴") return "휴";
  return s || null;
}

function shiftTime(label) {
  if (label === "D") return "06–14";
  if (label === "S") return "14–22";
  if (label === "N") return "22–06";
  return "";
}

export function CalendarCustomDays() {
  const token = useToken((s) => s.token);

  // ✅ { "YYYY-MM-DD": { labels: ["D","N"], textOnly?, cls } }
  const [shiftMap, setShiftMap] = React.useState({});

  const [range, setRange] = React.useState(() => {
    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return { from, to: addDays(from, 10) };
  });

  const [month, setMonth] = React.useState(new Date());
  const monthLabel = `${month.getFullYear()}.${String(month.getMonth() + 1).padStart(2, "0")}`;

  // ✅ 우측 모달(패널) 상태
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [panelDate, setPanelDate] = React.useState(null);

  const goPrev = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday = () => setMonth(new Date());

  // ESC 닫기
  React.useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  React.useEffect(() => {
    if (!token) return;

    let alive = true;

    (async () => {
      try {
        const data = await getPersonalSchedule(token);

        const list = Array.isArray(data)
          ? data
          : data?.schedule ||
            data?.scheduleList ||
            data?.items ||
            data?.data ||
            data?.result ||
            [];

        const map = {}; // dateKey -> Set(labels)
        let firstDateKey = null;

        for (const s of list || []) {
          const rawDate =
            s?.date || s?.workDate || s?.day || s?.startAt || s?.endAt;
          const dateKey = rawDate ? String(rawDate).slice(0, 10) : "";
          if (!dateKey) continue;

          if (!firstDateKey) firstDateKey = dateKey;

          const label = normalizeShift(s?.shift);
          if (!label) continue;

          if (!map[dateKey]) map[dateKey] = new Set();
          map[dateKey].add(label);
        }

        const next = {};
        for (const [dateKey, set] of Object.entries(map)) {
          const labels = Array.from(set);

          if (labels.length === 1 && labels[0] === "휴") {
            next[dateKey] = { labels: ["휴"], textOnly: true };
          } else {
            next[dateKey] = {
              labels,
              cls: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100",
            };
          }
        }

        if (!alive) return;
        setShiftMap(next);

        // 데이터 달로 자동 이동(있으면)
        if (firstDateKey) {
          const dt = new Date(firstDateKey + "T00:00:00");
          setMonth(new Date(dt.getFullYear(), dt.getMonth(), 1));
        }
      } catch (e) {
        console.error(e);
        if (alive) setShiftMap({});
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const openPanel = (dateKey) => {
    setPanelDate(dateKey);
    setPanelOpen(true);
  };

  const panelInfo = panelDate ? shiftMap[panelDate] : null;
  const panelLabels = panelInfo?.labels || [];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">
            {monthLabel}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToday}
              className="h-8 rounded-full bg-slate-100 px-4 text-[12px] font-medium text-slate-800 hover:bg-slate-200 active:bg-slate-300"
            >
              오늘
            </Button>

            <div className="flex items-center overflow-hidden rounded-full bg-slate-100 h-8">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goPrev}
                className="h-8 w-10 rounded-none hover:bg-slate-200 active:bg-slate-300"
              >
                <ChevronLeftIcon className="size-4 text-slate-800" />
              </Button>

              <div className="w-px h-4 bg-slate-300/70" />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={goNext}
                className="h-8 w-10 rounded-none hover:bg-slate-200 active:bg-slate-300"
              >
                <ChevronRightIcon className="size-4 text-slate-800" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 달력 + 우측 패널을 같은 컨테이너 안에서 오버레이로 */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="relative h-full min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-black/5">
          {/* 본문 달력 */}
          <div className="h-full min-h-0 p-5">
            <Calendar
              mode="default"
              fixedWeeks
              month={month}
              onMonthChange={setMonth}
              selected={range}
              onSelect={setRange}
              numberOfMonths={1}
              className="p-0 w-full"
              classNames={{
                month_caption: "hidden",
                caption_label: "hidden",
                nav: "hidden",
                weekdays:
                  "flex border-b border-slate-200/70 pb-2 [&>*:first-child]:text-rose-500",
                weekday:
                  "flex-1 text-left pl-1.5 text-xs text-slate-500 font-medium",
                week: "flex w-full h-[98px]",
                day: "relative w-full h-full text-left align-top border-b border-slate-100",
              }}
              components={{
                DayButton: ({ children, day, modifiers, ...props }) => {
                  const d = day?.date;
                  if (!d) return null;

                  const key = ymdLocal(d);
                  const isSunday = d.getDay() === 0;
                  const isToday = !!modifiers?.today;
                  const isOutside = !!modifiers?.outside;

                  const info = shiftMap[key];
                  const labels = info?.labels || [];

                  // 표시용: 첫 라벨 + more
                  const label = labels[0];
                  const more = labels.length > 1 ? labels.length - 1 : 0;

                  return (
                    <CalendarDayButton
                      day={day}
                      modifiers={modifiers}
                      {...props}
                      className={cn(
                        "w-full h-full p-2 relative",
                        "flex flex-col items-start justify-start",
                        "outline-none focus-visible:ring-0 ring-0 ring-offset-0 shadow-none",
                        "hover:bg-slate-100 active:bg-slate-200 transition-colors",
                        isOutside && "opacity-35",
                        isSunday && "text-rose-500!",
                        (modifiers?.selected ||
                          modifiers?.range_start ||
                          modifiers?.range_middle ||
                          modifiers?.range_end) &&
                          isSunday &&
                          "text-rose-500!",
                      )}
                    >
                      <div
                        className={cn(
                          "text-sm font-medium leading-none text-slate-900",
                          isSunday && "text-rose-500",
                          isToday && "text-indigo-800 font-semibold",
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          {isToday && (
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                          )}
                          {children}
                        </span>
                      </div>

                      {/* 휴 */}
                      {!isOutside && info?.textOnly && label === "휴" && (
                        <div className="mt-3 text-[13px] font-semibold text-rose-600">
                          휴
                        </div>
                      )}

                      {/* shift 카드 */}
                      {!isOutside && !info?.textOnly && label && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openPanel(key);
                          }}
                          className={cn(
                            "mt-2 w-full h-9 flex items-center gap-2 px-3 rounded-xl",
                            info?.cls ||
                              "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100",
                            "hover:brightness-[0.98] active:brightness-[0.95]",
                          )}
                        >
                          <span className="text-[15px] font-semibold leading-none">
                            {label}
                          </span>

                          <span className="text-[12px] font-medium text-slate-600 leading-none">
                            {shiftTime(label)}
                          </span>

                          {more ? (
                            <span className="ml-auto text-[11px] font-bold text-slate-600">
                              +{more}
                            </span>
                          ) : null}
                        </button>
                      )}
                    </CalendarDayButton>
                  );
                },
              }}
            />
          </div>

          {/* ✅ 우측 “살짝” 모달/패널 */}
          {panelOpen ? (
            <>
              {/* 바깥 클릭 닫기용 오버레이 (투명) */}
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="absolute inset-0 z-10 cursor-default"
                aria-label="close-overlay"
              />

              <div
                className={cn(
                  "absolute z-20 top-5 right-5",
                  "w-[320px] max-w-[85vw]",
                  "rounded-2xl bg-white shadow-xl ring-1 ring-black/10",
                  "overflow-hidden",
                )}
              >
                {/* 헤더 */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900">
                      {panelDate || "-"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      내 근무 상세
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200"
                    aria-label="close"
                  >
                    <X className="size-4 text-slate-700" />
                  </button>
                </div>

                {/* 바디 */}
                <div className="max-h-[60vh] overflow-auto p-4">
                  {panelLabels.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      이 날짜에는 표시할 근무 정보가 없습니다.
                    </div>
                  ) : panelLabels.length === 1 && panelLabels[0] === "휴" ? (
                    <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
                      휴무
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {panelLabels.map((lb, i) => (
                        <div
                          key={`${lb}-${i}`}
                          className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-black/5"
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-[15px] font-bold text-slate-900">
                              {lb}
                            </div>
                            <div className="text-[12px] font-medium text-slate-600">
                              {shiftTime(lb)}
                            </div>
                          </div>

                          {/* 여기 아래에 task/machine/operation 넣고 싶으면 확장하면 됩니다 */}
                          {/* <div className="mt-1 text-[12px] text-slate-600">...</div> */}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 푸터(선택) */}
                <div className="border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="w-full rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white hover:bg-slate-800 active:bg-slate-700"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
