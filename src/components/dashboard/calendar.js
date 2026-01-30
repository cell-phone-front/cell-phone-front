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

  // D / S / N 은 컬러 배지, 휴는 글씨만
  const shiftMap = {
    "2026-01-02": { code: "D", badge: "bg-green-100 text-green-800" },
    "2026-01-03": { code: "S", badge: "bg-blue-100 text-blue-800" },
    "2026-01-04": { code: "N", badge: "bg-purple-100 text-purple-800" },
    "2026-01-05": { code: "휴", textOnly: true }, //  휴: 글씨만
  };

  return (
    <div className="h-full w-full flex flex-col rounded-xl bg-white overflow-hidden">
      {/* 상단 툴바 */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-1 bg-muted/20 pt-3">
        <div className="text-[15px] font-semibold truncate">{monthLabel}</div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="h-5 px-3 text-[9px] rounded-full"
          >
            오늘
          </Button>

          <div className="flex items-center rounded-full border bg-white overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="h-5 w-7"
            >
              <ChevronLeftIcon className="size-3" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="h-5 w-7"
            >
              <ChevronRightIcon className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* 달력 */}
      <div className="flex-1 min-h-0 p-3">
        <Calendar
          mode="default"
          month={month}
          onMonthChange={setMonth}
          selected={range}
          onSelect={setRange}
          numberOfMonths={1}
          className="p-0 [--cell-size:92px]"
          classNames={{
            month_caption: "hidden",
            caption_label: "hidden",
            nav: "hidden",
            weekdays: "flex mb-1 [&>*:first-child]:!text-red-500",
            weekday:
              "flex-1 text-left pl-1 text-[10px] text-muted-foreground font-medium border-b",
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
                    "w-full h-(--cell-size)] p-0 rounded-md overflow-hidden",
                    "flex flex-col items-stretch justify-start",
                    "hover:bg-muted/30 active:bg-muted/50",
                    //  오늘 기본 회색 배경 제거
                    isToday &&
                      "bg-transparent! hover:bg-transparent! active:bg-transparent!",
                  )}
                >
                  <div className="flex items-center justify-between px-1.5 pt-1">
                    {/* 날짜 */}
                    <div
                      className={cn(
                        "text-[11px] font-medium leading-none",
                        isSunday && "text-red-500",
                        isToday &&
                          "font-extrabold underline underline-offset-4 decoration-2",
                      )}
                    >
                      {children}
                    </div>

                    {/* 오른쪽 위 표시 */}
                    {!isOutside &&
                      shift?.code &&
                      (shift.textOnly ? (
                        //  휴: 글씨만 (라운드/배경 없음)
                        <div className="mr-1 text-[10px] font-semibold text-red-600">
                          {shift.code}
                        </div>
                      ) : (
                        // D / S / N : 컬러 배지
                        <div
                          className={cn(
                            "mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none",
                            shift.badge,
                          )}
                        >
                          {shift.code}
                        </div>
                      ))}
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
