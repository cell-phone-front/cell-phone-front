// src/pages/accounts/index.js
import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";
import { ChevronLeft, ChevronRight, Search, X, Pencil } from "lucide-react";
import { getMembers } from "@/api/member-api";

/* ===============================
   util
=============================== */
function cryptoId() {
  try {
    return (
      globalThis.crypto?.randomUUID?.() || `rid-${Date.now()}-${Math.random()}`
    );
  } catch {
    return `rid-${Date.now()}-${Math.random()}`;
  }
}

function normalizeDate(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "";
  }
  const s = String(v).trim();
  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];
  if (s.includes("/") || s.includes(".")) {
    const parts = s.split(/[/\.]/);
    if (parts.length >= 3) {
      const y = parts[0];
      const m = String(parts[1]).padStart(2, "0");
      const d = String(parts[2]).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return s;
}

function normalizeMember(r) {
  return {
    _rid: r._rid || cryptoId(),
    id: r.id ?? "",
    name: r.name ?? "",
    email: r.email ?? "",
    phoneNumber: r.phoneNumber ?? r.phone_number ?? "",
    dept: r.dept ?? "",
    workTeam: r.workTeam ?? r.work_team ?? "",
    role: r.role ?? "",
    hireDate: normalizeDate(
      r.hireDate ??
        r.hire_date ??
        r.hiredate ??
        r.joinDate ??
        r.join_date ??
        r.joinedAt ??
        r.hire_dt ??
        "",
    ),
  };
}

function RoleBadge({ role }) {
  const r = String(role || "").toUpperCase();
  if (!r) return <span className="text-slate-400">-</span>;

  const cls =
    r === "ADMIN"
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
      : r === "PLANNER"
        ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
        : r === "WORKER"
          ? "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
          : "bg-slate-50 text-slate-700 ring-1 ring-slate-200";

  return (
    <span
      className={[
        "inline-flex items-center justify-center",
        "h-6 px-2.5 rounded-full",
        "text-[11px] font-semibold whitespace-nowrap",
        cls,
      ].join(" ")}
      title={r}
    >
      {r}
    </span>
  );
}

function StatCard({ title, value, sub, tone = "indigo" }) {
  const toneMap = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-2 hover:shadow transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-slate-500">
            {title}
          </div>
          <div className="mt-0.5 text-[18px] font-black text-slate-900 tabular-nums">
            {value}
          </div>
          {sub ? (
            <div className="mt-0.5 text-[10px] text-slate-500 truncate">
              {sub}
            </div>
          ) : null}
        </div>

        <div
          className={[
            "shrink-0 h-9 w-9 rounded-2xl grid place-items-center ring-1",
            toneMap[tone] || toneMap.indigo,
          ].join(" ")}
        >
          <span className="text-[12px] font-black">#</span>
        </div>
      </div>
    </div>
  );
}

/* ===============================
   Row Detail (Portal + fixed)
=============================== */
function RowDetailModalLine({ open, onClose, anchorEl, row }) {
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorEl || !row) return;

    const calc = () => {
      const a = anchorEl.getBoundingClientRect();
      const gap = 10;

      const width = Math.min(980, window.innerWidth - 24);
      let left = a.left;
      left = Math.min(left, window.innerWidth - width - 12);
      left = Math.max(12, left);

      const h = 52;
      const downTop = a.bottom + gap;
      const canDown = downTop + h < window.innerHeight - 12;
      const top = canDown ? downTop : a.top - gap - h;

      setStyle({
        position: "fixed",
        top,
        left,
        width,
        zIndex: 9999,
      });
    };

    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);

    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
    };
  }, [open, anchorEl, row]);

  if (!open || !row || !style) return null;

  return createPortal(
    <div style={style}>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 w-full overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="h-8 w-8 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-sm shrink-0">
            <span className="text-[12px] font-black">i</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-slate-900 truncate">
              {row.name || "-"}{" "}
              <span className="text-slate-400 font-medium">
                · {row.id || "-"}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-600 truncate">
              {row.email || "-"} · {row.phoneNumber || "-"} · {row.dept || "-"}{" "}
              / {row.workTeam || "-"} · {row.hireDate || "-"}
            </div>
          </div>

          <div className="shrink-0">
            <RoleBadge role={row.role} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-9 w-9 rounded-xl grid place-items-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CellText({ value, title }) {
  const v = value == null || value === "" ? "-" : String(value);
  return (
    <div
      className="h-10 w-full flex items-center px-2 text-[13px] text-slate-800 truncate"
      title={title ? String(title) : v}
    >
      {v}
    </div>
  );
}

export default function AccountsPage() {
  const router = useRouter();
  const token = useToken((s) => s.token);

  const [data, setData] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const [query, setQuery] = useState("");

  // 모달 라인
  const [openRid, setOpenRid] = useState(null);
  const rowRefs = useRef({}); // rid -> tr element

  useEffect(() => {
    if (!token) return;

    let alive = true;
    const t = setTimeout(() => {
      getMembers(token)
        .then((json) => {
          if (!alive) return;
          const list =
            json.memberList || json.members || json.items || json.data || [];
          const rows = (list || []).map((r) => normalizeMember(r));
          setData(rows);
          setPageIndex(0);
          setLoadError("");
          setOpenRid(null);
        })
        .catch((err) => {
          console.error(err);
          setLoadError(err?.message || "Accounts 불러오기 실패");
        });
    }, 150);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [token]);

  const filteredData = useMemo(() => {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return data;

    return data.filter((r) => {
      const hay = [
        r.id,
        r.name,
        r.email,
        r.phoneNumber,
        r.dept,
        r.workTeam,
        r.role,
        r.hireDate,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [data, query]);

  const totalRows = filteredData.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const safeIndex = Math.min(pageIndex, pageCount - 1);
    const start = safeIndex * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageIndex, pageSize, pageCount]);

  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(Math.max(0, pageCount - 1));
  }, [pageIndex, pageCount]);

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  const openRow = (rid) => setOpenRid((prev) => (prev === rid ? null : rid));

  const openRowData = useMemo(() => {
    if (!openRid) return null;
    return data.find((r) => r._rid === openRid) || null;
  }, [openRid, data]);

  const anchorEl = openRid ? rowRefs.current[openRid] : null;

  const stats = useMemo(() => {
    const all = filteredData;
    const upper = (v) => String(v || "").toUpperCase();
    const admin = all.filter((r) => upper(r.role) === "ADMIN").length;
    const planner = all.filter((r) => upper(r.role) === "PLANNER").length;
    const worker = all.filter((r) => upper(r.role) === "WORKER").length;
    return { total: all.length, admin, planner, worker };
  }, [filteredData]);

  return (
    <DashboardShell crumbTop="관리" crumbCurrent="accounts">
      <div className="px-4 pt-4 w-full min-w-0 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[1280px] h-[calc(100vh-120px)] flex flex-col gap-4 pb-6">
          {/* ===== Top summary ===== */}
          <div className="shrink-0 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="px-5 py-4">
              {/* title row */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-sm shrink-0">
                      <span className="text-[14px] font-black">A</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[18px] font-black text-slate-900 truncate">
                          Accounts
                        </div>
                        <span className="text-[12px] font-semibold text-slate-400">
                          전체보기
                        </span>
                      </div>
                      <div className="text-[12px] text-slate-500 truncate">
                        전체보기(읽기 전용)입니다. 수정은 ‘수정하기’에서
                        진행해주세요.
                      </div>
                    </div>
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative w-[420px]">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPageIndex(0);
                      }}
                      placeholder="검색 (Id/Name/Email/Phone/Dept/Team/Role/HireDate)"
                      className="
                        h-10 w-full rounded-full
                        border border-slate-200 bg-white
                        pl-9 pr-10 text-[13px]
                        outline-none transition
                        hover:border-slate-300
                        focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                        placeholder:text-[12px] placeholder:text-slate-400
                      "
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setPageIndex(0);
                        }}
                        className="
                          absolute right-2 top-1/2 -translate-y-1/2
                          h-8 w-8 rounded-full
                          grid place-items-center
                          text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                        "
                        aria-label="clear"
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/accounts/edit")}
                    className="
                      h-10 px-5 rounded-full
                      bg-indigo-600 text-white
                      text-[13px] font-semibold
                      hover:bg-indigo-500 active:bg-indigo-700
                      active:scale-[0.98]
                      shadow-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-200
                      inline-flex items-center gap-2
                    "
                  >
                    <Pencil size={15} />
                    수정하기
                  </button>
                </div>
              </div>

              {/* stat cards */}
              <div className="mt-4 grid grid-cols-4 gap-3">
                <StatCard
                  title="TOTAL"
                  value={stats.total}
                  sub="검색 조건이 적용된 전체 인원"
                  tone="slate"
                />
                <StatCard
                  title="ADMIN"
                  value={stats.admin}
                  sub="시스템 관리자"
                  tone="rose"
                />
                <StatCard
                  title="PLANNER"
                  value={stats.planner}
                  sub="계획/운영 담당"
                  tone="indigo"
                />
                <StatCard
                  title="WORKER"
                  value={stats.worker}
                  sub="현장 작업자"
                  tone="emerald"
                />
              </div>

              {loadError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  {loadError}
                </div>
              ) : null}
            </div>
          </div>

          {/* ===== Table ===== */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex-1 min-h-0 flex flex-col">
              <RowDetailModalLine
                open={!!openRid}
                onClose={() => setOpenRid(null)}
                anchorEl={anchorEl}
                row={openRowData}
              />

              {/* ✅ operation처럼: header table / body scroll table 분리 */}
              <div className="shrink-0">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "240px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "140px" }} />
                  </colgroup>
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-[12px] font-semibold text-slate-600 bg-slate-50">
                      <th className="border-b border-slate-200 px-4 py-3">
                        사원번호
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        이름
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        Email
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        전화번호
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        부서
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        Team
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        직급
                      </th>
                      <th className="border-b border-slate-200 px-4 py-3">
                        입사 일자
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "240px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "140px" }} />
                  </colgroup>

                  <tbody className="text-[13px]">
                    {pageRows.map((row) => {
                      const isOpen = openRid === row._rid;

                      return (
                        <tr
                          key={row._rid}
                          ref={(el) => {
                            if (el) rowRefs.current[row._rid] = el;
                          }}
                          className={[
                            "group transition-colors cursor-pointer",
                            isOpen
                              ? "bg-indigo-50/60"
                              : "hover:bg-indigo-50/40",
                          ].join(" ")}
                          onClick={(e) => {
                            const tag = String(
                              e.target?.tagName || "",
                            ).toLowerCase();
                            if (tag === "button" || tag === "a") return;
                            openRow(row._rid);
                          }}
                        >
                          <td className="border-b border-slate-100 px-4 py-2">
                            <CellText value={row.id} />
                          </td>
                          <td className="border-b border-slate-100 px-4 py-2">
                            <CellText value={row.name} />
                          </td>
                          <td className="border-b border-slate-100 px-4 py-2">
                            <CellText value={row.email} title={row.email} />
                          </td>
                          <td className="border-b border-slate-100 px-4 py-2">
                            <CellText value={row.phoneNumber} />
                          </td>
                          <td className="border-b border-slate-100 px-4 py-2">
                            <CellText value={row.dept} />
                          </td>
                          <td className="border-b border-slate-100 px-4 py-2">
                            <CellText value={row.workTeam} />
                          </td>
                          <td className="border-b border-slate-100 px-4 py-2">
                            <div className="h-10 flex items-center">
                              <RoleBadge role={row.role} />
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-4 py-2">
                            <CellText value={row.hireDate} />
                          </td>
                        </tr>
                      );
                    })}

                    {pageRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-14 text-center text-[13px] text-slate-500"
                        >
                          표시할 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* footer */}
              <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 bg-white">
                <div className="text-[12px] text-slate-500">
                  총{" "}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {totalRows}
                  </span>
                  건 · 페이지{" "}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {pageIndex + 1}
                  </span>
                  /{" "}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {pageCount}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={pageIndex === 0}
                    className={[
                      "h-9 px-3 rounded-xl text-[12px] font-semibold",
                      "inline-flex items-center gap-1 transition",
                      pageIndex === 0
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-700 hover:bg-slate-100 cursor-pointer",
                    ].join(" ")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={pageIndex >= pageCount - 1}
                    className={[
                      "h-9 px-3 rounded-xl text-[12px] font-semibold",
                      "inline-flex items-center gap-1 transition",
                      pageIndex >= pageCount - 1
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-700 hover:bg-slate-100 cursor-pointer",
                    ].join(" ")}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* /Table */}
        </div>
      </div>
    </DashboardShell>
  );
}
