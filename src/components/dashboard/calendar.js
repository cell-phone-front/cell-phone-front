"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

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

  const shiftMap = {
    "2026-01-02": { label: "주간", cls: "bg-green-100 text-green-800" }, // D
    "2026-01-03": { label: "스윙", cls: "bg-blue-100 text-blue-800" }, // S
    "2026-01-04": { label: "야간", cls: "bg-purple-100 text-purple-800" }, // G
    "2026-01-05": { label: "휴무", cls: "bg-red-100 text-red-800" }, // OFF
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* 상단 툴바 */}
      <div className="hfit shrink-0 flex items-center gap-3 border-b px-3">
        <div className="min-w-0">
          <div className="ml-1.5 text-[14px] font-semibold truncate">
            {monthLabel}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="h-4 text-[10px] bg-muted/70 rounded-xl"
          ></Button>

          <div className="flex items-center overflow-hidden rounded-md h-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="h-4 w-7"
            >
              <ChevronLeftIcon className="size-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="h-4 w-7"
            >
              <ChevronRightIcon className="size-5" />
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
          className="p-1 [--cell-size:26px]" // ✅ 핵심: 패딩 줄이고 셀 기준 크기 줄이기
          classNames={{
            month_caption: "hidden",
            caption_label: "hidden",
            nav: "hidden",

            weekdays: "flex border-b pb-1 mb-1",
            weekday:
              "flex-1 text-left pl-2 text-[10px] text-muted-foreground font-medium",

            week: "flex w-full h-10", // ✅ h-9 말고 h-10~11 권장
            day: "relative w-full h-full text-left align-top border-b border-border/60",
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
                  <div className="text-left h-full w-full flex flex-col items-start justify-start p-0.5">
                    <div
                      className={`text-[11px] font-medium leading-none ${isSunday ? "text-red-500" : ""}`} // ✅ 글자 줄이기
                    >
                      {children}
                    </div>

                    {!modifiers?.outside && shift && (
                      <div
                        className={`mt-0.5 w-full rounded px-1 py-0.5 text-[10px] font-semibold ${shift.cls}`} // ✅ 라벨도 더 작게
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
