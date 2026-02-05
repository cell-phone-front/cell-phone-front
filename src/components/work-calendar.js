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

  const shiftMap = {
    "2026-01-02": {
      label: "D",
      cls: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100",
    },
    "2026-01-03": {
      label: "S",
      cls: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100",
    },
    "2026-01-04": {
      label: "N",
      cls: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100",
    },
    "2026-01-05": { label: "휴", textOnly: true },
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* 헤더 */}
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

      {/* 본문 */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        {/* ✅ 라운드/여백/넘침 방지 */}
        <div className="h-full min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-black/5">
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

                // ✅ 핵심: week 높이 고정 (h-full 절대 금지)
                week: "flex w-full h-[98px]",

                day: "relative w-full h-full text-left align-top border-b border-slate-100",
              }}
              components={{
                DayButton: ({ children, day, modifiers, ...props }) => {
                  const d = day?.date;
                  if (!d) return null;

                  const key = d.toISOString().slice(0, 10);
                  const isSunday = d.getDay() === 0;
                  const isToday = !!modifiers?.today;
                  const isOutside = !!modifiers?.outside;

                  const shift = shiftMap[key];

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

                      {!isOutside && shift && shift.label !== "휴" && (
                        <div
                          className={cn(
                            "mt-2 w-full h-9",
                            "flex items-center gap-2 px-3",
                            "rounded-xl",
                            shift.cls,
                          )}
                        >
                          <span className="text-[15px] font-semibold leading-none">
                            {shift.label}
                          </span>
                          <span className="text-[12px] font-medium text-slate-600 leading-none">
                            {shift.label === "D" && "06–14"}
                            {shift.label === "S" && "14–22"}
                            {shift.label === "N" && "22–06"}
                          </span>
                        </div>
                      )}

                      {!isOutside && shift && shift.label === "휴" && (
                        <div className="mt-3 text-[13px] font-semibold text-rose-600">
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
      </div>
    </div>
  );
}
