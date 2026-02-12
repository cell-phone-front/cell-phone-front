// src/pages/accounts/index.js  (읽기전용 전체보기)
import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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

/** 서버 응답이 snake_case든 camelCase든 다 받아서 통일 */
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

function Badge({ color, children }) {
  const map = {
    green: "bg-green-50 text-green-600 border-green-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    gray: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={[
        "inline-flex justify-center min-w-[64px]",
        "text-[11px] px-2 py-0.5 rounded-full",
        "border font-medium",
        map[color] || map.gray,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
function RoleBadge({ role }) {
  const r = String(role || "").toUpperCase();

  const roleLabel =
    r === "ADMIN"
      ? "ADMIN"
      : r === "PLANNER"
        ? "PLANNER"
        : r === "WORKER"
          ? "WORKER"
          : "";

  const roleBadgeClass =
    r === "ADMIN"
      ? "bg-red-50 text-red-700 ring-2 ring-red-200"
      : r === "PLANNER"
        ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
        : "bg-slate-50 text-slate-700 ring-2 ring-slate-200";

  if (!roleLabel) return <span className="text-slate-400">-</span>;

  return (
    <span
      className={[
        "text-[10px] px-2 py-0.5 w-17 text-center rounded-full",
        roleBadgeClass,
      ].join(" ")}
    >
      {roleLabel}
    </span>
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

      const h = 46;
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-lg ring-2 ring-black/5 w-full">
        <div className="flex items-center gap-2 px-5 py-3 w-full">
          <span className="text-[12px] font-semibold text-slate-800 whitespace-nowrap">
            상세
          </span>

          <span className="mx-3 h-3 w-px bg-slate-200" />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-slate-700 flex-1 min-w-0">
            <div className="whitespace-nowrap">
              <span className="font-semibold text-slate-900">Id</span>:
              <span className="ml-1 font-medium">{row.id || "-"}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-semibold text-slate-900">Name</span>:
              <span className="ml-1 font-medium">{row.name || "-"}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-semibold text-slate-900">Email</span>:
              <span className="ml-1 font-medium">{row.email || "-"}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-semibold text-slate-900">Phone</span>:
              <span className="ml-1 font-medium">{row.phoneNumber || "-"}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-semibold text-slate-900">Dept</span>:
              <span className="ml-1 font-medium">{row.dept || "-"}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-semibold text-slate-900">Team</span>:
              <span className="ml-1 font-medium">{row.workTeam || "-"}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-semibold text-slate-900">Role</span>:
              <span className="ml-1 font-medium">{row.role || "-"}</span>
            </div>
            <div className="whitespace-nowrap">
              <span className="font-semibold text-slate-900">Hire</span>:
              <span className="ml-1 font-medium">{row.hireDate || "-"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
      className="h-9 w-full flex items-center px-2 text-sm text-slate-800 truncate"
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
  const [pageSize] = useState(10);

  const [query, setQuery] = useState("");

  // ✅ 모달 라인 열림 상태
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

  // role 요약 (상단 카드용)
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
      {/* 상단 헤더 (스샷 느낌: pill + counts + actions) */}
      {/* 상단 헤더 (검색/수정 위, 카운트 아래) */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            {/* 1줄: 타이틀(좌) + 검색/수정(우) */}
            <div className="flex items-start justify-between gap-4">
              {/* 좌측: 타이틀/설명 */}
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

              {/* 우측: 검색 + 수정하기 (위로) */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPageIndex(0);
                    }}
                    placeholder="검색 (Id/Name/Email/Phone/Dept/Team/Role/HireDate)"
                    className="
                h-10 w-[360px] rounded-full
                border border-slate-200 bg-white
                px-4 pr-10 text-[13px]
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
                      ✕
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
            "
                >
                  수정하기
                </button>
              </div>
            </div>

            {/* 2줄: 카운트(아래로) + 글씨 작게 */}
            {/* 2줄: 왼쪽 설명 / 오른쪽 통계 */}
            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-600">
              {/* 왼쪽 (비워두거나 설명용) */}
              <div className="text-slate-400">총 인원 현황</div>

              {/* 오른쪽 (TOTAL | ADMIN | ...) */}
              <div className="flex items-center gap-2">
                <span>
                  TOTAL{" "}
                  <span className="tabular-nums text-slate-900">
                    {stats.total}
                  </span>
                </span>

                <span className="text-slate-300">|</span>

                <span>
                  ADMIN{" "}
                  <span className="tabular-nums text-slate-900">
                    {stats.admin}
                  </span>
                </span>

                <span className="text-slate-300">|</span>

                <span>
                  PLANNER{" "}
                  <span className="tabular-nums text-slate-900">
                    {stats.planner}
                  </span>
                </span>

                <span className="text-slate-300">|</span>

                <span>
                  WORKER{" "}
                  <span className="tabular-nums text-slate-900">
                    {stats.worker}
                  </span>
                </span>
              </div>
            </div>

            {loadError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                {loadError}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="relative overflow-x-hidden">
            {/* ✅ 모달처럼 겹쳐서 뜨는 1줄 상세 */}
            <RowDetailModalLine
              open={!!openRid}
              onClose={() => setOpenRid(null)}
              anchorEl={anchorEl}
              row={openRowData}
            />

            <div className="h-full overflow-auto">
              <table className="w-full border-separate border-spacing-0 table-fixed">
                <thead className="sticky top-0 z-10 bg-slate-700 text-white">
                  <tr className="text-left text-sm">
                    <th className="w-[110px] border-b border-slate-200 px-3 py-3 font-medium">
                      Id
                    </th>
                    <th className="w-[120px] border-b border-slate-200 px-3 py-3 font-medium">
                      Name
                    </th>
                    <th className="w-[220px] border-b border-slate-200 px-3 py-3 font-medium">
                      Email
                    </th>
                    <th className="w-[140px] border-b border-slate-200 px-3 py-3 font-medium">
                      Phone
                    </th>
                    <th className="w-[150px] border-b border-slate-200 px-3 py-3 font-medium">
                      Department
                    </th>
                    <th className="w-[110px] border-b border-slate-200 px-3 py-3 font-medium">
                      Team
                    </th>
                    <th className="w-[120px] border-b border-slate-200 px-3 py-3 font-medium">
                      Role
                    </th>
                    <th className="w-[140px] border-b border-slate-200 px-3 py-3 font-medium">
                      Hire Date
                    </th>
                  </tr>
                </thead>

                <tbody className="text-sm">
                  {pageRows.map((row) => {
                    const isOpen = openRid === row._rid;
                    const roleUp = String(row.role || "").toUpperCase();
                    const statusColor =
                      roleUp === "ADMIN"
                        ? "indigo"
                        : roleUp === "PLANNER"
                          ? "green"
                          : "gray";

                    return (
                      <tr
                        key={row._rid}
                        ref={(el) => {
                          if (el) rowRefs.current[row._rid] = el;
                        }}
                        className={[
                          "transition-colors hover:bg-slate-50 cursor-pointer",
                          isOpen ? "bg-indigo-50/40" : "",
                        ].join(" ")}
                        onClick={(e) => {
                          const tag = String(
                            e.target?.tagName || "",
                          ).toLowerCase();
                          if (tag === "button" || tag === "a") return;
                          openRow(row._rid);
                        }}
                      >
                        <td className="border-b border-slate-100 px-3 py-2">
                          <CellText value={row.id} />
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <CellText value={row.name} />
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <CellText value={row.email} title={row.email} />
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <CellText value={row.phoneNumber} />
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <CellText value={row.dept} />
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <CellText value={row.workTeam} />
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          <div className="h-9 flex items-center">
                            <RoleBadge role={row.role} />
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <CellText value={row.hireDate} />
                        </td>
                      </tr>
                    );
                  })}

                  {pageRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-14 text-center text-sm text-slate-500"
                      >
                        표시할 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* 페이지네이션 */}
        <div className="shrink-0 flex items-center justify-end px-1 py-9 pt-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageIndex === 0}
            className={[
              "h-8 px-3 text-[11px] rounded-md transition inline-flex items-center gap-1",
              pageIndex === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200 cursor-pointer",
            ].join(" ")}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>

          <div className="min-w-20 text-center text-[12px]">
            <span className="font-medium">{pageIndex + 1}</span>
            <span className="text-gray-500"> / {pageCount}</span>
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={pageIndex >= pageCount - 1}
            className={[
              "h-8 px-3 text-[11px] rounded-md transition inline-flex items-center gap-1",
              pageIndex >= pageCount - 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200 cursor-pointer",
            ].join(" ")}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="h-4" />
    </DashboardShell>
  );
}
