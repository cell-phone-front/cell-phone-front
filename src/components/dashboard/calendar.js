"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardCalendar() {
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

  // ✅ 남색 톤으로 통일 (원하시면 D/S/N 각각 다른 색도 가능)
  const shiftMap = {
    "2026-01-02": {
      code: "D",
      badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    },
    "2026-01-03": {
      code: "S",
      badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    },
    "2026-01-04": {
      code: "N",
      badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    },
    "2026-01-05": { code: "휴", textOnly: true },
  };

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      {/* 상단 툴바 */}
      {/* 패딩탑2 배경색지우기 */}
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
          month={month}
          onMonthChange={setMonth}
          selected={range}
          onSelect={setRange}
          numberOfMonths={1}
          className="p-0 [--cell-size:88px]"
          classNames={{
            month_caption: "hidden",
            caption_label: "hidden",
            nav: "hidden",

            weekdays: "flex mb-2",
            weekday:
              "flex-1 text-left pl-1 pb-2 text-[11px] text-slate-500 font-medium border-b border-slate-200/70 [&:first-child]:text-rose-500",

            week: "flex w-full",
            day: "relative w-full h-full text-left align-top",
          }}
          components={{
            DayButton: ({ children, day, modifiers, ...props }) => {
              const d = day?.date;
              if (!d) return null;

              const key = d.toISOString().slice(0, 10);
              const isSunday = d.getDay() === 0;
              const isOutside = !!modifiers?.outside;
              const isToday = !!modifiers?.today;

              const shift = shiftMap[key];

              return (
                <CalendarDayButton
                  day={day}
                  modifiers={modifiers}
                  {...props}
                  className={cn(
                    "w-full h-(--cell-size)] p-0 overflow-hidden rounded-xl",
                    "flex flex-col items-stretch justify-start",
                    // ✅ 카드톤 hover/active
                    "hover:bg-gray-100 active:bg-gray-200 transition-colors",
                    // ✅ outside 날짜는 흐리게
                    isOutside && "opacity-40",
                    // ✅ 오늘 배경 제거 + 은은한 표시만
                    isToday &&
                      "bg-transparent hover:bg-gray-100 active:bg-gray-200",
                  )}
                >
                  <div className="flex items-center justify-between px-2 pt-2">
                    {/* 날짜 */}
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

                    {/* 오른쪽 위 표시 */}
                    {!isOutside &&
                      shift?.code &&
                      (shift.textOnly ? (
                        <div className="mr-0.5 text-[10px] font-semibold text-rose-600">
                          {shift.code}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "mr-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold leading-none",
                            shift.badge,
                          )}
                        >
                          {shift.code}
                        </div>
                      ))}
                  </div>

                  {/* 아래 컨텐츠 영역(필요시 일정 dot/요약 넣기) */}
                  <div className="mt-2 flex-1 px-2 pb-2">
                    {/* 예: 일정 점들(필요시 사용) */}
                    {/* <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    </div> */}
                  </div>
                </CalendarDayButton>
              );
            },
          }}
        />
      </div>
    </div>
  );
}
