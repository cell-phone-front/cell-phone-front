"use client";

import * as React from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, X, Save } from "lucide-react";
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

const MEMO_KEY = "aps_calendar_memo_v1";

// ✅ 메모 프리뷰: 첫 줄만(길면 …)
function memoPreview(text, max = 18) {
  const t = String(text || "").trim();
  if (!t) return "";
  const oneLine = t.replace(/\s+/g, " ");
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max) + "…";
}

export function CalendarCustomDays() {
  const token = useToken((s) => s.token);

  const [shiftMap, setShiftMap] = React.useState({});

  const [range, setRange] = React.useState(() => {
    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return { from, to: addDays(from, 10) };
  });

  const [month, setMonth] = React.useState(new Date());
  const monthLabel = `${month.getFullYear()}.${String(month.getMonth() + 1).padStart(2, "0")}`;

  const [panelOpen, setPanelOpen] = React.useState(false);
  const [panelDate, setPanelDate] = React.useState(null);

  const [memoMap, setMemoMap] = React.useState({});
  const [memoDraft, setMemoDraft] = React.useState("");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(MEMO_KEY);
      if (raw) setMemoMap(JSON.parse(raw));
    } catch (e) {
      console.error(e);
      setMemoMap({});
    }
  }, []);

  const persistMemoMap = React.useCallback((next) => {
    try {
      localStorage.setItem(MEMO_KEY, JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const goPrev = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday = () => setMonth(new Date());

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

        const map = {};
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

  const openPanel = React.useCallback(
    (dateKey) => {
      setPanelDate(dateKey);
      setPanelOpen(true);
      setMemoDraft(memoMap?.[dateKey] || "");
    },
    [memoMap],
  );

  const saveMemo = React.useCallback(() => {
    if (!panelDate) return;
    const text = String(memoDraft || "").trimEnd();

    const next = { ...(memoMap || {}) };
    if (!text.trim()) delete next[panelDate];
    else next[panelDate] = text;

    setMemoMap(next);
    persistMemoMap(next);
    setMemoDraft(text);
  }, [memoDraft, memoMap, panelDate, persistMemoMap]);

  const clearMemo = React.useCallback(() => {
    if (!panelDate) return;
    const next = { ...(memoMap || {}) };
    delete next[panelDate];
    setMemoMap(next);
    persistMemoMap(next);
    setMemoDraft("");
  }, [memoMap, panelDate, persistMemoMap]);

  const panelInfo = panelDate ? shiftMap[panelDate] : null;
  const panelLabels = panelInfo?.labels || [];
  const hasMemo = !!(panelDate && memoMap?.[panelDate]);

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

      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="relative h-full min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-black/5">
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
                  const label = labels[0];
                  const more = labels.length > 1 ? labels.length - 1 : 0;

                  // ... DayButton 내부
                  const memo = memoMap?.[key];
                  const memoText = memoPreview(memo, 18); // 기존 함수 그대로 사용
                  const hasMemoDot = !isOutside && !!memoText;

                  return (
                    <CalendarDayButton
                      day={day}
                      modifiers={modifiers}
                      {...props}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isOutside) openPanel(key);
                      }}
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
                      {/* 날짜 숫자 */}
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
                          {hasMemoDot && (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          )}
                          {children}
                        </span>
                      </div>

                      {/* 휴무 */}
                      {!isOutside && info?.textOnly && label === "휴" && (
                        <div className="mt-2 text-[13px] font-semibold text-rose-600 text-left w-full">
                          휴
                        </div>
                      )}

                      {/* ✅ 근무 버튼이 먼저(위로) */}
                      {/* ✅ 근무 버튼: 메모 바 스타일 기준으로 통일 */}
                      {!isOutside && !info?.textOnly && label && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openPanel(key);
                          }}
                          className={cn(
                            "mt-1 w-full", // ✅ mt-2 -> mt-1
                            "rounded-lg bg-slate-50 px-2 py-1",
                            "ring-1 ring-black/5",
                            "text-[11px] leading-4 text-left",
                            "overflow-hidden", // ✅ 추가
                            "hover:bg-slate-100 active:bg-slate-200 transition",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-slate-900 shrink-0">
                              {label}
                            </span>
                            <span className="font-medium text-slate-600 truncate min-w-0">
                              {shiftTime(label)}
                            </span>
                            {more ? (
                              <span className="ml-auto text-[11px] font-bold text-slate-600 shrink-0">
                                +{more}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      )}

                      {/* ✅ 메모 프리뷰는 마지막(아래로) + 왼쪽 정렬 */}
                      {!isOutside && memoText ? (
                        <div
                          className={cn(
                            "mt-1 w-full", // ✅ mt-2 -> mt-1
                            "rounded-lg bg-slate-50 px-2 py-1",
                            "text-[11px] leading-4 text-slate-700",
                            "ring-1 ring-black/5",
                            "text-left",
                            "overflow-hidden", // ✅ 추가
                          )}
                          title={String(memo || "")}
                        >
                          <div className="truncate">{memoText}</div>{" "}
                          {/* ✅ 1줄로 잘라서 높이 고정 */}
                        </div>
                      ) : null}
                    </CalendarDayButton>
                  );
                },
              }}
            />
          </div>

          {/* 우측 패널(기존 그대로) */}
          {panelOpen ? (
            <>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="absolute inset-0 z-10 cursor-default"
                aria-label="close-overlay"
              />

              <div
                className={cn(
                  "absolute z-20 top-5 right-5",
                  "w-[360px] max-w-[90vw]",
                  "rounded-2xl bg-white shadow-xl ring-1 ring-black/10",
                  "overflow-hidden",
                )}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900">
                      {panelDate || "-"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      근무 + 메모
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

                <div className="max-h-[65vh] overflow-auto p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="text-[12px] font-semibold text-slate-700">
                      근무
                    </div>

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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="text-[12px] font-semibold text-slate-700">
                        메모
                      </div>
                      {hasMemo ? (
                        <span className="ml-2 text-[11px] font-medium text-slate-500">
                          저장됨
                        </span>
                      ) : null}
                    </div>

                    <textarea
                      value={memoDraft}
                      onChange={(e) => setMemoDraft(e.target.value)}
                      placeholder="이 날짜에 대한 메모를 입력하세요."
                      className={cn(
                        "w-full min-h-[140px] resize-y rounded-xl",
                        "bg-white px-3 py-2 text-[13px] text-slate-900",
                        "ring-1 ring-black/10 focus:ring-2 focus:ring-indigo-200 outline-none",
                      )}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={clearMemo}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-200 active:bg-slate-300"
                      >
                        지우기
                      </button>
                      <button
                        type="button"
                        onClick={saveMemo}
                        className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-indigo-500 active:bg-indigo-700 inline-flex items-center justify-center gap-2"
                      >
                        <Save className="size-4" />
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
