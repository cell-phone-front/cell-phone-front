"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export function CalendarCustomDays() {
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

  const shiftMap = {
    "2026-01-02": { label: "주간", cls: "bg-green-100 text-green-800" }, // D
    "2026-01-03": { label: "스윙", cls: "bg-blue-100 text-blue-800" }, // S
    "2026-01-04": { label: "야간", cls: "bg-purple-100 text-purple-800" }, // G
    "2026-01-05": { label: "휴무", cls: "bg-red-100 text-red-800" }, // OFF
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* 상단 툴바 */}
      <div className="h-12 shrink-0 flex items-center gap-3 border-b px-3">
        <div className="min-w-0">
          <div className="ml-1.5 text-[17px] font-semibold truncate">
            {monthLabel}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="h-7 px-2 text-xs"
          >
            오늘
          </Button>

          <div className="flex items-center overflow-hidden rounded-md border h-7">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="h-7 w-7"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>

            <div className="px-2 text-xs font-medium">{monthLabel}</div>

            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="h-7 w-7"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 달력 */}
      <div className="flex-1 min-h-0">
        <Calendar
          mode="default"
          month={month}
          onMonthChange={setMonth}
          selected={range}
          onSelect={setRange}
          numberOfMonths={1}
          //  셀 크기 줄이기 (밑에 짤림 방지)
          classNames={{
            month_caption: "hidden",
            caption_label: "hidden",
            nav: "hidden",

            // ✅ 요일 줄: 왼쪽 정렬 + 밑줄
            weekdays: "flex border-b pb-2 mb-2",
            weekday:
              "flex-1 text-left pl-2 text-xs text-muted-foreground font-medium",

            // ✅ 여기서 “주(week) 한 줄” 높이 컨트롤 가능
            week: "flex w-full mt-1",

            //  셀(칸) 자체의 패딩/레이아웃 영향
            day: "relative w-full h-full p-0 text-left align-top",
            week: "flex w-full mt-1 h-30",
          }}
          components={{
            DayButton: ({ children, day, modifiers, ...props }) => {
              const d = day?.date;
              if (!d) return null;

              const key = d.toISOString().slice(0, 10);
              const isSunday = d.getDay() === 0;
              const shift = shiftMap[key];

              return (
                <CalendarDayButton
                  day={day}
                  modifiers={modifiers}
                  {...props}
                  className="
                    focus-visible:ring-0 focus-visible:ring-offset-0
                    focus:outline-none outline-none
                    ring-0 ring-offset-0 shadow-none
                    hover:bg-transparent active:bg-transparent
                  "
                >
                  <div className="text-left h-full w-full flex flex-col items-start justify-start p-1">
                    <div
                      className={`text-sm font-medium leading-none ${isSunday ? "text-red-500" : ""}`}
                    >
                      {children}
                    </div>

                    {!modifiers?.outside && shift && (
                      <div
                        className={`mt-1 w-full rounded px-2 py-1 text-xs font-semibold ${shift.cls}`}
                      >
                        {shift.label}
                      </div>
                    )}
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
