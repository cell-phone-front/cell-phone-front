"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // ✅ SDN휴 로 변경 (라벨 텍스트만 변경, 셀높이/레이아웃 건드리지 않음)
  const shiftMap = {
    "2026-01-02": { label: "D", cls: "bg-green-100 text-green-800" }, // Day
    "2026-01-03": { label: "S", cls: "bg-blue-100 text-blue-800" }, // Swing
    "2026-01-04": { label: "N", cls: "bg-purple-100 text-purple-800" }, // Night
    "2026-01-05": { label: "휴", cls: "bg-red-100 text-red-800" }, // Off
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* 상단 툴바 */}
      <div className="h-12 shrink-0 flex items-center gap-3 px-3">
        <div className="min-w-0">
          <div className="ml-1.5 text-3xl font-semibold truncate">
            {monthLabel}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="h-8 px-5 text-[11px] rounded-full"
          >
            오늘
          </Button>

          <div className="flex items-center rounded-full border bg-white overflow-hidden h-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="h-15 w-10 rounded-none"
            >
              <ChevronLeftIcon className="size-5" />
            </Button>

            <div className="w-px h-4 bg-border" />

            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="h-15 w-10 rounded-none"
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
          classNames={{
            month_caption: "hidden",
            caption_label: "hidden",
            nav: "hidden",

            weekdays: "flex border-b pb-2 mb-1 [&>*:first-child]:!text-red-500",
            weekday:
              "flex-1 text-left pl-1.5 text-xs text-muted-foreground font-medium",

            day: "relative w-full h-full text-left align-top border-b border-border/60",
            week: "flex w-full h-27",
          }}
          components={{
            DayButton: ({ children, day, modifiers, ...props }) => {
              const d = day?.date;
              if (!d) return null;

              const key = d.toISOString().slice(0, 10);
              const isSunday = d.getDay() === 0;
              const shift = shiftMap[key];
              const isToday = !!modifiers?.today;

              return (
                <CalendarDayButton
                  day={day}
                  modifiers={modifiers}
                  {...props}
                  className={cn(
                    // ✅ 핵심: 버튼을 셀 전체로!
                    "w-full h-full p-1 relative",
                    "flex flex-col items-start justify-start",
                    "focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none",
                    "ring-0 ring-offset-0 shadow-none",
                    "hover:bg-transparent active:bg-transparent",

                    // ✅ 일요일 글자 빨강 유지
                    isSunday && "text-red-500!",
                    (modifiers?.selected ||
                      modifiers?.range_start ||
                      modifiers?.range_middle ||
                      modifiers?.range_end) &&
                      isSunday &&
                      "text-red-500!",
                  )}
                >
                  {/* 날짜 */}
                  <div
                    className={cn(
                      "text-sm font-medium leading-none",
                      isSunday && "text-red-500",
                      isToday &&
                        "underline underline-offset-4 decoration-2 font-bold",
                    )}
                  >
                    {children}
                  </div>

                  {/* 바: D/S/N + 시간 (셀 가로 꽉) */}
                  {!modifiers?.outside && shift && shift.label !== "휴" && (
                    <div
                      className={cn(
                        "absolute left-1 right-1 top-6 h-7",
                        "flex items-center px-2 gap-2",
                        "rounded-sm",
                        shift.cls,
                      )}
                    >
                      {/* D/S/N 크게 */}
                      <span className="text-[14px] font-semibold leading-none">
                        {shift.label}
                      </span>

                      {/* 시간은 작게, 무채색 */}
                      <span className="text-[10px] font-medium text-neutral-600 leading-none">
                        {shift.label === "D" && "06–14"}
                        {shift.label === "S" && "14–22"}
                        {shift.label === "N" && "22–06"}
                      </span>
                    </div>
                  )}

                  {/* 휴: 배경 없이 글씨만 */}
                  {!modifiers?.outside && shift && shift.label === "휴" && (
                    <div className="absolute left-1 top-7.5 text-[13px] font-semibold text-red-600 leading-none">
                      휴
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
