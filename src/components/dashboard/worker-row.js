// src/components/dashboard/worker-row.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToken, useAccount } from "@/stores/account-store";
import { getPersonalSchedule } from "@/api/simulation-api";
import { getNotices } from "@/api/notice-api";
import { Pin } from "lucide-react";

/* =========================
  utils
========================= */
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
  return s || "";
}

function pickTodayShiftLabel(list) {
  const todayKey = ymdLocal(new Date());
  for (const s of list || []) {
    const rawDate = s?.date || s?.workDate || s?.day || s?.startAt || s?.endAt;
    const dateKey = rawDate ? String(rawDate).slice(0, 10) : "";
    if (dateKey !== todayKey) continue;

    const label = normalizeShift(s?.shift);
    if (label) return label;
  }
  return "";
}

function hmToMinutes(hm) {
  const [h, m] = String(hm || "0:0")
    .split(":")
    .map((x) => parseInt(x, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function lunchStatus(lunch) {
  if (!lunch)
    return { state: "none", text: "오늘은 휴무입니다.", remain: null };

  const a = hmToMinutes(lunch.from);
  const b = hmToMinutes(lunch.to);
  const n = nowMinutes();

  if (n < a) {
    const min = a - n;
    return { state: "upcoming", text: `${min}분 후 시작`, remain: min };
  }
  if (n >= a && n < b) {
    const min = b - n;
    return { state: "ongoing", text: `진행 중 · ${min}분 남음`, remain: min };
  }
  return { state: "done", text: "식사 시간 종료", remain: 0 };
}

function fmtDate(v) {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];
  return s.slice(0, 10);
}

function getId(n) {
  return n?.id ?? n?.noticeId ?? n?.notice_id ?? n?._id ?? "";
}

function isPinned(n) {
  const v =
    n?.pinned ??
    n?.isPinned ??
    n?.pin ??
    n?.fixed ??
    n?.top ??
    n?.pinnedYn ??
    n?.pinned_yn;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toUpperCase() === "Y" || v === "1";
  if (typeof v === "number") return v === 1;
  return false;
}

function toTs(v) {
  if (!v) return 0;
  const t = Date.parse(String(v));
  if (!Number.isNaN(t)) return t;
  return 0;
}

/* =========================
  시간(근무조)
========================= */
function getLunchByShift(shift) {
  if (shift === "D") return { label: "점심", from: "12:00", to: "13:00" };
  if (shift === "S") return { label: "저녁", from: "18:00", to: "19:00" };
  if (shift === "N") return { label: "야식", from: "00:00", to: "01:00" };
  if (shift === "휴") return null;
  return { label: "점심", from: "12:00", to: "13:00" };
}

/* =========================
  ✅ 요일별 점심 메뉴 데이터 (샘플)
========================= */
const LUNCH_MENU_BY_DAY = {
  MON: ["제육볶음", "계란찜", "미역국", "김치", "과일"],
  TUE: ["돈까스", "우동국물", "양배추샐러드", "단무지", "요구르트"],
  WED: ["불고기", "된장찌개", "잡채", "김치", "바나나"],
  THU: ["마파두부", "계란국", "춘권", "김치", "주스"],
  FRI: ["카레라이스", "치킨가라아게", "샐러드", "깍두기", "푸딩"],
  SAT: ["김치볶음밥", "어묵국", "만두", "단무지", "우유"],
  SUN: ["휴무/간편식", "컵라면", "삼각김밥", "음료"],
};

function dayKey(d = new Date()) {
  const k = d.getDay(); // 0=일
  if (k === 0) return "SUN";
  if (k === 1) return "MON";
  if (k === 2) return "TUE";
  if (k === 3) return "WED";
  if (k === 4) return "THU";
  if (k === 5) return "FRI";
  return "SAT";
}

function dayLabelKo(key) {
  if (key === "MON") return "월";
  if (key === "TUE") return "화";
  if (key === "WED") return "수";
  if (key === "THU") return "목";
  if (key === "FRI") return "금";
  if (key === "SAT") return "토";
  return "일";
}

function getLunchMenuToday() {
  const k = dayKey(new Date());
  return { dayKey: k, menu: LUNCH_MENU_BY_DAY[k] || [] };
}

function pctBetween(from, to) {
  const a = hmToMinutes(from);
  const b = hmToMinutes(to);
  const n = nowMinutes();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  if (n <= a) return 0;
  if (n >= b) return 100;
  const pct = Math.round(((n - a) / (b - a)) * 100);
  return Math.max(0, Math.min(100, pct));
}

/* =========================
  header (긴 세로선)
========================= */
function SectionHeader({ title, desc, right = null }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <span className="w-1.5 self-stretch rounded-full bg-slate-300/70 shrink-0" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-5 text-slate-900 truncate">
              {title}
            </div>
            {desc ? (
              <div className="mt-0.5 text-[11px] leading-4 text-slate-500 truncate">
                {desc}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/* =========================
  main
========================= */
export default function WorkerDashboardRow() {
  const token = useToken((s) => s.token);
  const account = useAccount((s) => s.account);

  const [shiftLabel, setShiftLabel] = useState("");
  const [loadingShift, setLoadingShift] = useState(true);

  const [notices, setNotices] = useState([]);
  const [loadingNotice, setLoadingNotice] = useState(true);

  // ✅ shift
  useEffect(() => {
    if (!token) return;

    let alive = true;
    setLoadingShift(true);

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

        const todayShift = pickTodayShiftLabel(list);
        if (!alive) return;
        setShiftLabel(todayShift);
      } catch {
        if (!alive) return;
        setShiftLabel("");
      } finally {
        if (alive) setLoadingShift(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  // ✅ notices (워커도 요약만)
  useEffect(() => {
    if (!token) return;

    let alive = true;
    setLoadingNotice(true);

    getNotices(token)
      .then((json) => {
        if (!alive) return;
        const list =
          json?.noticeList || json?.notices || json?.items || json?.data || [];
        setNotices(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!alive) return;
        setNotices([]);
      })
      .finally(() => {
        if (alive) setLoadingNotice(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  const name =
    account?.name || account?.memberName || account?.username || "작업자";

  const lunch = useMemo(() => getLunchByShift(shiftLabel), [shiftLabel]);
  const lunchInfo = useMemo(() => lunchStatus(lunch), [lunch]);

  const lunchTone =
    lunchInfo.state === "ongoing"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : lunchInfo.state === "upcoming"
        ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
        : lunchInfo.state === "done"
          ? "bg-slate-50 text-slate-600 ring-slate-200"
          : "bg-slate-50 text-slate-600 ring-slate-200";

  const topNotices = useMemo(() => {
    const sorted = [...(notices || [])].sort((a, b) => {
      const ta = toTs(a?.createdAt ?? a?.date);
      const tb = toTs(b?.createdAt ?? b?.date);
      return tb - ta;
    });

    return sorted.slice(0, 4).map((n) => ({
      id: getId(n),
      title: n?.title ?? "",
      createdAt: fmtDate(n?.createdAt ?? n?.date ?? ""),
      pinned: isPinned(n),
    }));
  }, [notices]);

  // ✅ 오늘 메뉴
  const todayMenu = useMemo(() => getLunchMenuToday(), []);
  const todayKey = todayMenu.dayKey;
  const todayMenuList = todayMenu.menu;

  // ✅ 타임라인 퍼센트(목표)
  const computedPct = useMemo(() => {
    if (!lunch) return 0;
    return pctBetween(lunch.from, lunch.to);
  }, [lunch]);

  // ✅ “처음에도 움직이게” 0 → computedPct
  const [pct, setPct] = useState(0);
  useEffect(() => {
    setPct(0);
    const raf = requestAnimationFrame(() => setPct(computedPct));
    return () => cancelAnimationFrame(raf);
  }, [computedPct]);

  // ✅ 요일표 데이터 (표로 예쁘게)
  const weekRows = useMemo(() => {
    const order = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    return order.map((k) => ({
      key: k,
      day: `${dayLabelKo(k)}요일`,
      isToday: k === todayKey,
      menu: LUNCH_MENU_BY_DAY[k] || [],
    }));
  }, [todayKey]);

  return (
    <>
      <div className="grid min-h-0 gap-5 md:grid-cols-[2fr_1fr] md:h-[380px]">
        {/* (1) ✅ 식사 안내 (2칸) */}
        <section className="min-h-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 flex flex-col">
          <SectionHeader
            title="식사 안내"
            desc={`오늘(${dayLabelKo(todayKey)}) 메뉴/시간`}
            right={
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                {dayLabelKo(todayKey)}요일
              </span>
            }
          />

          <div className="flex-1 min-h-0 px-4 pb-4">
            <div className="h-full min-h-0 grid grid-cols-[1fr_1fr] gap-4">
              {/* 왼쪽: 시간+진행바+오늘 메뉴 */}
              <div className="min-h-0 rounded-2xl border border-slate-200 bg-white p-4">
                {lunch ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-slate-500">
                          {lunch.label} 시간
                        </div>
                        <div className="mt-1 text-[16px] font-extrabold text-slate-900 tabular-nums">
                          {lunch.from} ~ {lunch.to}
                        </div>
                      </div>

                      <span
                        className={[
                          "shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                          lunchTone,
                        ].join(" ")}
                      >
                        {lunchInfo.text}
                      </span>
                    </div>

                    {/* ✅ 애니메이션 타임라인 */}
                    <div className="mt-4">
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-400/70 transition-[width] duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 tabular-nums">
                        <span>{lunch.from}</span>
                        <span>{lunch.to}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-[12px] text-slate-500">
                    오늘은 휴무입니다.
                  </div>
                )}

                {/* 오늘의 메뉴 */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-900">
                    오늘의 메뉴
                  </div>

                  {todayMenuList.length === 0 ? (
                    <div className="mt-2 text-[11px] text-slate-500">
                      메뉴 정보가 없습니다.
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {todayMenuList.map((m, i) => (
                        <span
                          key={`${m}-${i}`}
                          className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 text-[10px] text-slate-400">
                    * 메뉴는 요일 기준 샘플 데이터입니다. (원하시면 서버 API로
                    교체 가능합니다)
                  </div>
                </div>
              </div>

              {/* 오른쪽: ✅ 요일별 메뉴 표 */}
              <div className="min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {/* ✅ 타이틀 영역 제거 */}

                <div className="h-full min-h-0 overflow-auto pretty-scroll px-2 py-3">
                  <table className="w-full table-fixed text-[11px]">
                    <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
                      <tr className="text-left text-[10px] font-semibold text-slate-500">
                        <th className="w-[70px] px-2 py-2">요일</th>
                        <th className="px-2 py-2">메뉴</th>
                      </tr>
                    </thead>

                    <tbody>
                      {weekRows.map((r) => (
                        <tr
                          key={r.key}
                          className={[
                            "border-b border-slate-100",
                            r.isToday
                              ? "bg-indigo-50/50"
                              : "hover:bg-slate-50/70",
                          ].join(" ")}
                        >
                          <td className="px-2 py-2">
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                r.isToday
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-slate-100 text-slate-700",
                              ].join(" ")}
                            >
                              {r.day}
                            </span>
                          </td>

                          <td className="px-2 py-2">
                            {r.menu.length ? (
                              <div className="flex flex-wrap gap-1">
                                {r.menu.map((m, i) => (
                                  <span
                                    key={`${r.key}-${m}-${i}`}
                                    className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* (2) ✅ 공지 요약 (1칸) - 원하시면 메모장으로 바꿔드릴게요 */}
      </div>
    </>
  );
}
