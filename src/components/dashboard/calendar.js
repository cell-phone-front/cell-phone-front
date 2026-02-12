// src/components/dashboard/calendar.js
"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPersonalSchedule } from "@/api/simulation-api";
import { useToken } from "@/stores/account-store";

/* utils */
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

export function DashboardCalendar({ month, onMonthChange }) {
  const token = useToken((s) => s.token);

  const [range, setRange] = React.useState(() => {
    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return { from, to: addDays(from, 10) };
  });

  // const [month, setMonth] = React.useState(new Date());
  // const monthLabel = `${month.getFullYear()}.${String(month.getMonth() + 1).padStart(2, "0")}`;

  // const goPrev = () =>
  //   setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  // const goNext = () =>
  //   setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  // const goToday = () => setMonth(new Date());

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

        const map = {};
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
          if (labels.length === 1 && labels[0] === "휴")
            next[dateKey] = { labels: ["휴"], textOnly: true };
          else next[dateKey] = { labels };
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
    <div className="h-full min-h-0 w-full overflow-hidden bg-white">
      {/* 상단 툴바 */}
      {/* <div className="shrink-0 px-5 pt-2 pb-2">
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
      </div> */}

      {/* ✅ 달력 영역: 남은 높이 안에서만 렌더 + 필요 시 스크롤 */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        <div className="h-full min-h-0 overflow-auto pr-1">
          <Calendar
            mode="default"
            month={month}
            onMonthChange={onMonthChange}
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            className="p-0
  [--cell-size:40px]
  lg:[--cell-size:40px]
"
            classNames={{
              month_caption: "hidden",
              caption_label: "hidden",
              nav: "hidden",

              weekdays: "flex mb-2",
              weekday:
                "flex-1 text-left pl-1 pb-1 text-[10px] text-slate-500 font-medium border-b border-slate-200/70 [&:first-child]:text-rose-500",

              // ✅ 56 고정 제거 (var 기반)
              week: "flex w-full h-[var(--cell-size)]",
              day: "relative w-full h-[var(--cell-size)] text-left align-top",
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
                const hasWork = !isOutside && labels.length > 0;

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
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                          )}
                          {children}
                        </span>

                        {isToday && (
                          <div className="mt-1 h-0.5 w-8 rounded-full bg-indigo-200" />
                        )}
                      </div>
                    </div>

                    {/* 점 표시 */}
                    {hasWork && !isToday ? (
                      <div className="mt-auto px-2 pb-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                      </div>
                    ) : (
                      <div className="mt-auto px-2 pb-2 opacity-0 select-none">
                        <span className="inline-block h-2 w-2 rounded-full" />
                      </div>
                    )}
                  </CalendarDayButton>
                );
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
