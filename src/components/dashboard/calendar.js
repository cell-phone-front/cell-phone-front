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

  const shiftMap = {
    "2026-01-02": { label: "주간", cls: "bg-green-100 text-green-800" },
    "2026-01-03": { label: "스윙", cls: "bg-blue-100 text-blue-800" },
    "2026-01-04": { label: "야간", cls: "bg-purple-100 text-purple-800" },
    "2026-01-05": { label: "휴무", cls: "bg-red-100 text-red-800" },
  };

  return (
    <div className="h-full w-full flex flex-col rounded-xl bg-white overflow-hidden">
      {/* 상단 툴바 */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-muted/20">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold truncate">{monthLabel}</div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="h-6 px-2 text-[10px] rounded-full"
          >
            오늘
          </Button>

          <div className="flex items-center rounded-full border bg-white overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="h-6 w-7 rounded-none"
            >
              <ChevronLeftIcon className="size-3" />
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="h-6 w-7 rounded-none"
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
          className="p-0 [--cell-size:30px]" //  셀 기준 크기 살짝 키워서 안정감
          classNames={{
            month_caption: "hidden",
            caption_label: "hidden",
            nav: "hidden",

            //  요일줄: 밑줄 제거 + 간격 정리
            weekdays: "flex mb-1 [&>*:first-child]:!text-red-500",
            weekday:
              "flex-1 text-left pl-1 text-[10px] text-muted-foreground font-medium border-b",

            //  각 주 높이 고정(셀 안에서 흔들림 방지)
            week: "flex w-full",
            //  day는 테두리 제거해서 답답함 줄이기
            day: "relative w-full h-full text-left align-top",
          }}
          components={{
            DayButton: ({ children, day, modifiers, ...props }) => {
              const d = day?.date;
              if (!d) return null;

              const key = d.toISOString().slice(0, 10);
              const isSunday = d.getDay() === 0;
              const shift = shiftMap[key];

              const isOutside = !!modifiers?.outside;

              return (
                <CalendarDayButton
                  day={day}
                  modifiers={modifiers}
                  {...props}
                  className={cn(
                    //  버튼 자체를 "카드 셀"처럼 고정 레이아웃
                    "min-w-(--cell-size) w-full h-(--cell-size) p-0 rounded-md",
                    "flex flex-col items-stretch justify-start",
                    "hover:bg-muted/40 active:bg-muted/60",
                    "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
                    "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
                    "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
                    "data-[range-middle=true]:bg-muted/40",
                    // outside 흐리게
                    isOutside && "opacity-40",
                    //  일요일은 항상 빨강 유지
                    isSunday && "text-red-500!",
                    (modifiers?.selected ||
                      modifiers?.range_start ||
                      modifiers?.range_middle ||
                      modifiers?.range_end) &&
                      isSunday &&
                      "text-red-500!",
                  )}
                >
                  {/* 위: 날짜 */}
                  <div className="flex items-center justify-between px-1.5 pt-1">
                    <div
                      className={cn(
                        "text-[11px] font-medium leading-none",
                        isSunday && "text-red-500",
                      )}
                    >
                      {children}
                    </div>
                  </div>

                  {/* 아래: shift 라벨(작게, 한 줄) */}
                  <div className="px-1.5 pb-1 mt-auto">
                    {!isOutside && shift ? (
                      <div
                        className={cn(
                          "w-full  px-1 py-0.5 text-[9px] font-semibold leading-none text-center",
                          shift.cls,
                        )}
                      >
                        {shift.label}
                      </div>
                    ) : (
                      <div className="h-[14px]" /> // ✅ 라벨 없는 날도 높이 유지
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
