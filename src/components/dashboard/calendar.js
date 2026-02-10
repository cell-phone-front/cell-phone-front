"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPersonalSchedule } from "@/api/simulation-api";
import { useToken } from "@/stores/account-store";

/* ===============================
   utils
=============================== */
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

/* ===============================
   Dashboard Calendar
=============================== */
export function DashboardCalendar() {
  const token = useToken((s) => s.token);

  const [range, setRange] = React.useState(() => {
    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return { from, to: addDays(from, 10) };
  });

  const [month, setMonth] = React.useState(new Date());
  const monthLabel = `${month.getFullYear()}.${String(month.getMonth() + 1).padStart(2, "0")}`;

  const goPrev = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday = () => setMonth(new Date());

  // { "YYYY-MM-DD": { labels: ["D","N"], textOnly?, badge } }
  const [shiftMap, setShiftMap] = React.useState({});

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

        for (const s of list || []) {
          const rawDate =
            s?.date || s?.workDate || s?.day || s?.startAt || s?.endAt;
          const dateKey = rawDate ? String(rawDate).slice(0, 10) : "";
          if (!dateKey) continue;

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
              badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
            };
          }
        }

        if (!alive) return;
        setShiftMap(next);
      } catch (e) {
        console.error(e);
        if (alive) setShiftMap({});
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      {/* 상단 툴바 */}
      <div className="shrink-0 px-5 pt-2 pb-2">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold tracking-tight text-slate-900">
              {monthLabel}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToday}
              className="h-7 rounded-full bg-white px-3 text-[10px] font-medium text-slate-700 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 active:bg-gray-100"
            >
              오늘
            </Button>

            <div className="flex items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
              <Button
                variant="ghost"
                size="icon"
                onClick={goPrev}
                className="h-7 w-9 hover:bg-gray-50 active:bg-gray-100"
              >
                <ChevronLeftIcon className="size-4 text-slate-700" />
              </Button>
              <div className="h-4 w-px bg-slate-200" />
              <Button
                variant="ghost"
                size="icon"
                onClick={goNext}
                className="h-7 w-9 hover:bg-gray-50 active:bg-gray-100"
              >
                <ChevronRightIcon className="size-4 text-slate-700" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 달력 */}
      <div className="flex-1 min-h-0 p-4">
        <Calendar
          mode="default"
          fixedWeeks // ✅ 월마다 5주/6주 바뀌어도 높이 고정
          month={month}
          onMonthChange={setMonth}
          selected={range}
          onSelect={setRange}
          numberOfMonths={1}
          className="p-0 [--cell-size:56px]"
          classNames={{
            month_caption: "hidden",
            caption_label: "hidden",
            nav: "hidden",

            weekdays: "flex mb-2",
            weekday:
              "flex-1 text-left pl-1 pb-2 text-[11px] text-slate-500 font-medium border-b border-slate-200/70 [&:first-child]:text-rose-500",

            week: "flex w-full h-[56px]",
            day: "relative w-full h-[56px] text-left align-top",
          }}
          components={{
            DayButton: ({ children, day, modifiers, ...props }) => {
              const d = day?.date;
              if (!d) return null;

              const key = ymdLocal(d);
              const isSunday = d.getDay() === 0;
              const isOutside = !!modifiers?.outside;
              const isToday = !!modifiers?.today;

              const info = shiftMap[key];
              const labels = info?.labels || [];
              const hasWork = !isOutside && labels.length > 0; // 휴/근무 구분 없이 "뭔가 있으면"
              // 휴무도 점 찍고 싶으면 위대로, 휴무는 빼고 싶으면:
              // const hasWork = !isOutside && labels.length > 0 && !(labels.length === 1 && labels[0] === "휴");

              return (
                <CalendarDayButton
                  day={day}
                  modifiers={modifiers}
                  {...props}
                  className={cn(
                    "w-full h-[var(--cell-size)] p-0 overflow-hidden rounded-xl",
                    "flex flex-col items-stretch justify-start",
                    "hover:bg-gray-100 active:bg-gray-200 transition-colors",
                    isOutside && "opacity-40",
                    isToday &&
                      "bg-transparent hover:bg-gray-100 active:bg-gray-200",
                  )}
                >
                  {/* 상단: 날짜(숫자) */}
                  <div className="flex items-start justify-between px-2 pt-2">
                    <div
                      className={cn(
                        "text-[12px] font-medium leading-none text-slate-900",
                        isSunday && "text-rose-500",
                        isToday && "font-semibold text-indigo-800",
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {isToday && (
                          // ✅ 오늘 점 (기존 그대로)
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                        )}
                        {children}
                      </span>

                      {isToday && (
                        <div className="mt-1 h-0.5 w-8 rounded-full bg-indigo-200" />
                      )}
                    </div>
                  </div>

                  {/* ✅ 근무 있는 날: 오늘처럼 "점만" (그레이) */}
                  {hasWork && !isToday ? (
                    <div className="mt-auto px-2 pb-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                    </div>
                  ) : (
                    // 높이 흔들림 방지용 자리(원치 않으면 삭제 가능)
                    <div className="mt-auto px-2 pb-2 opacity-0 select-none">
                      <span className="inline-block h-1.5 w-1.5 rounded-full" />
                    </div>
                  )}
                </CalendarDayButton>
              );
            },
          }}
        />
      </div>
    </div>
  );
}
