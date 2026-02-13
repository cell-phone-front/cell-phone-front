// src/pages/accounts/edit.js
import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";
import {
  ArrowDownToLine,
  FileUp,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ArrowLeft,
  Plus,
  Users,
  Shield,
  ClipboardList,
  HardHat,
  AlertCircle,
} from "lucide-react";

import { getMembers, parseMemberXLS, postMembers } from "@/api/member-api";

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

/** 전화번호 유틸: 하이픈/공백 제거 후 숫자만 11자리 */
function normalizePhone(v) {
  return String(v || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}
function isValidPhone(phone) {
  return /^010\d{8}$/.test(phone);
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

function normalizeMember(r, flag = "Y") {
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
    flag: r.flag ?? flag, // "Y" | "pre" | "new"
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

function StatusPill({ flag }) {
  const f = String(flag || "");
  const map =
    f === "pre"
      ? {
          label: "IMPORTED",
          cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        }
      : f === "new"
        ? {
            label: "NEW",
            cls: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
          }
        : {
            label: "SAVED",
            cls: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
          };

  return (
    <span
      className={[
        "inline-flex items-center justify-center",
        "h-6 px-2.5 rounded-full",
        "text-[11px] font-semibold whitespace-nowrap",
        map.cls,
      ].join(" ")}
    >
      {map.label}
    </span>
  );
}

function StatCard({ title, value, sub, tone = "indigo", icon = null }) {
  const toneMap = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-3 hover:shadow transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-slate-500">
            {title}
          </div>
          <div className="mt-1 tabular-nums text-[22px] font-black text-slate-900">
            {value}
          </div>
          {sub ? (
            <div className="mt-1 text-[11px] text-slate-500 truncate">
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
          {icon ? icon : <span className="text-[12px] font-black">#</span>}
        </div>
      </div>
    </div>
  );
}

/* ===============================
   input
=============================== */
function TruncInput({
  value,
  onChange,
  placeholder,
  onClick,
  className = "",
  alignRight = false,
  type = "text",
  onBlur,
}) {
  const v = value ?? "";
  return (
    <input
      type={type}
      value={v}
      onChange={onChange}
      onClick={onClick}
      onBlur={onBlur}
      placeholder={placeholder}
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white",
        "px-3 text-[13px] outline-none transition",
        "hover:border-slate-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300",
        "truncate whitespace-nowrap overflow-hidden",
        alignRight ? "text-right" : "",
        className,
      ].join(" ")}
    />
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

          <div className="shrink-0 flex items-center gap-2">
            <RoleBadge role={row.role} />
            <StatusPill flag={row.flag} />
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

export default function AccountsEditPage() {
  const router = useRouter();
  const token = useToken((s) => s.token);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const [query, setQuery] = useState("");
  const fileRef = useRef(null);

  const [openRid, setOpenRid] = useState(null);
  const rowRefs = useRef({});

  const [phoneTouched, setPhoneTouched] = useState(() => new Set());

  useEffect(() => {
    if (!token) return;

    let alive = true;
    const t = setTimeout(() => {
      getMembers(token)
        .then((json) => {
          if (!alive) return;
          const list =
            json.memberList || json.members || json.items || json.data || [];
          const rows = (list || []).map((r) => normalizeMember(r, "Y"));

          setData(rows);
          setSelected(new Set());
          setPageIndex(0);
          setDirty(false);
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

  const selectedCount = selected.size;

  const isAllPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r._rid));
  const isSomePageSelected =
    pageRows.some((r) => selected.has(r._rid)) && !isAllPageSelected;

  const updateCell = (_rid, key, value) => {
    setData((prev) =>
      prev.map((r) => (r._rid === _rid ? { ...r, [key]: value } : r)),
    );
    setDirty(true);
  };

  const addRow = () => {
    const row = {
      _rid: cryptoId(),
      id: "",
      name: "",
      email: "",
      phoneNumber: "",
      dept: "",
      workTeam: "",
      role: "",
      hireDate: "",
      flag: "new",
    };
    setData((prev) => [row, ...prev]);
    setSelected(new Set());
    setPageIndex(0);
    setDirty(true);
  };

  const toggleOne = (_rid, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(_rid);
      else next.delete(_rid);
      return next;
    });
  };

  const toggleAllPage = (checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => {
        if (checked) next.add(r._rid);
        else next.delete(r._rid);
      });
      return next;
    });
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;

    const del = new Set(selected);
    setData((prev) => prev.filter((r) => !del.has(r._rid)));
    setSelected(new Set());
    setDirty(true);

    if (openRid && del.has(openRid)) setOpenRid(null);

    setPageIndex((p) => {
      const nextTotal = Math.max(0, totalRows - del.size);
      const nextPageCount = Math.max(1, Math.ceil(nextTotal / pageSize));
      return Math.min(p, nextPageCount - 1);
    });
  };

  const uploadHandle = () => {
    if (!token) {
      window.alert("토큰이 없어서 업로드할 수 없어요. 다시 로그인 해주세요.");
      return;
    }
    fileRef.current?.click();
  };

  const fileChangeHandle = (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !token) return;

    parseMemberXLS(file, token)
      .then((json) => {
        const list =
          json.memberList || json.items || json.members || json.data || [];
        const items = (list || []).map((r) => ({
          ...normalizeMember(r, "pre"),
          _rid: cryptoId(),
          flag: "pre",
        }));

        setData((prev) => [...items, ...prev]);
        setPageIndex(0);
        setSelected(new Set());
        setDirty(true);
        setLoadError("");
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err?.message || "엑셀 파싱 실패");
      });

    e.target.value = "";
  };

  const saveHandle = () => {
    if (!token) return;

    const invalidPhones = data.filter((r) => {
      const p = normalizePhone(r.phoneNumber);
      return r.phoneNumber && !isValidPhone(p);
    });
    if (invalidPhones.length > 0) {
      window.alert("전화번호는 010으로 시작하는 11자리 숫자여야 합니다.");
      return;
    }

    const payload = data.map(({ _rid, flag, ...rest }) => ({
      ...rest,
      phoneNumber: normalizePhone(rest.phoneNumber),
      hireDate: rest.hireDate === "" ? null : rest.hireDate,
    }));

    postMembers(payload, token)
      .then((ok) => {
        window.alert(ok ? "저장 완료" : "저장 실패");
        if (ok) setDirty(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err?.message || "저장 실패");
      });
  };

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
    const imported = all.filter((r) => String(r.flag) === "pre").length;
    return { total: all.length, admin, planner, worker, imported };
  }, [filteredData]);

  return (
    <DashboardShell crumbTop="관리" crumbCurrent="accounts">
      {/* ✅ operation과 동일 패턴: 바깥에서 한 번만 높이 고정 + min-w */}
      <div className="px-4 pt-4 w-full min-w-0 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[1280px] h-[calc(100vh-120px)] flex flex-col gap-4 pb-6">
          {/* ===== Top summary ===== */}
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4">
              {/* title row */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => router.push("/accounts")}
                      className="
                        h-10 w-10 rounded-2xl
                        bg-slate-100 text-slate-700
                        grid place-items-center
                        hover:bg-slate-200
                        transition shrink-0
                      "
                      aria-label="back"
                      title="전체보기로"
                    >
                      <ArrowLeft size={16} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[18px] font-black text-slate-900 truncate">
                          Accounts
                        </div>
                        <span className="text-[12px] font-semibold text-indigo-600">
                          수정하기
                        </span>

                        {dirty ? (
                          <span className="ml-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            변경됨
                          </span>
                        ) : (
                          <span className="ml-1 text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                            최신
                          </span>
                        )}
                      </div>

                      <div className="text-[12px] text-slate-500 truncate">
                        행 추가/업로드/수정 후 저장하면 서버에 반영됩니다.
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
                    onClick={uploadHandle}
                    className="
                      h-10 px-4 rounded-full
                      border border-slate-200 bg-white
                      text-[13px] font-semibold text-slate-700
                      hover:bg-slate-50
                      inline-flex items-center gap-2
                    "
                  >
                    <FileUp size={15} />
                    XLS 업로드
                  </button>

                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".xls,.xlsx"
                    onChange={fileChangeHandle}
                  />

                  <button
                    type="button"
                    onClick={saveHandle}
                    disabled={!dirty}
                    className={[
                      "h-10 px-6 rounded-full",
                      "inline-flex items-center gap-2 justify-center",
                      "text-[13px] font-semibold transition",
                      dirty
                        ? "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 active:scale-[0.98] shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        : "bg-indigo-50 text-indigo-300 cursor-not-allowed border border-indigo-100",
                    ].join(" ")}
                    title={dirty ? "변경 사항 저장" : "변경 사항 없음"}
                  >
                    <ArrowDownToLine size={16} className="shrink-0" />
                    저장
                  </button>
                </div>
              </div>

              {/* stat cards + work panel */}
              <div className="mt-4 grid grid-cols-12 gap-3">
                <div className="col-span-8 grid grid-cols-5 gap-3">
                  <StatCard
                    title="TOTAL"
                    value={stats.total}
                    sub="검색 조건이 적용된 전체"
                    tone="slate"
                    icon={<Users className="h-4 w-4" />}
                  />
                  <StatCard
                    title="ADMIN"
                    value={stats.admin}
                    sub="관리자"
                    tone="rose"
                    icon={<Shield className="h-4 w-4" />}
                  />
                  <StatCard
                    title="PLANNER"
                    value={stats.planner}
                    sub="계획/운영"
                    tone="indigo"
                    icon={<ClipboardList className="h-4 w-4" />}
                  />
                  <StatCard
                    title="WORKER"
                    value={stats.worker}
                    sub="작업자"
                    tone="slate"
                    icon={<HardHat className="h-4 w-4" />}
                  />
                  <StatCard
                    title="IMPORTED"
                    value={stats.imported}
                    sub="업로드로 추가"
                    tone="emerald"
                    icon={<FileUp className="h-4 w-4" />}
                  />
                </div>

                <div className="col-span-4">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-3 h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] font-semibold text-slate-500">
                        작업
                      </div>
                      <span className="text-[10px] text-slate-400">
                        controls
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={deleteSelected}
                        disabled={selectedCount === 0}
                        className={[
                          "h-10 px-4 rounded-full text-[13px] font-semibold transition inline-flex items-center gap-2",
                          selectedCount === 0
                            ? "bg-white text-slate-300 border border-slate-200 cursor-not-allowed"
                            : "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
                        ].join(" ")}
                      >
                        <Trash2 size={16} />
                        선택 삭제
                      </button>

                      <button
                        type="button"
                        onClick={addRow}
                        className="
                          h-10 px-5 rounded-full
                          border border-indigo-200 bg-white
                          text-[13px] font-semibold text-indigo-600
                          hover:bg-indigo-600 hover:text-white
                          transition inline-flex items-center gap-2
                        "
                      >
                        <Plus size={16} />행 추가
                      </button>
                      {loadError ? (
                        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                          {loadError}
                        </div>
                      ) : null}

                      {dirty ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl  px-3 py-2 text-[10px] text-amber-700">
                          <AlertCircle className="h-4 w-4" />
                          변경 사항이 있습니다. 저장 후 반영됩니다.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
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

              {/* header table */}
              <div className="shrink-0">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "44px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "220px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "110px" }} />
                  </colgroup>

                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-[12px] font-semibold text-slate-600 bg-slate-50">
                      <th className="border-b border-slate-200 px-3 py-3">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-indigo-600"
                            checked={isAllPageSelected}
                            ref={(el) => {
                              if (!el) return;
                              el.indeterminate = isSomePageSelected;
                            }}
                            onChange={(e) => toggleAllPage(e.target.checked)}
                          />
                        </div>
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        사원번호
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        이름
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        Email
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        전화번호
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        부서
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        Team
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        직급
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        입사 일자
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3">
                        상태
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>

              {/* body scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "44px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "220px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "110px" }} />
                  </colgroup>

                  <tbody className="text-[13px]">
                    {pageRows.map((row) => {
                      const isOpen = openRid === row._rid;

                      const digits = normalizePhone(row.phoneNumber);
                      const touched = phoneTouched.has(row._rid);
                      const showRed =
                        touched && digits.length > 0 && digits.length !== 11;

                      const isUploaded = String(row.flag) === "pre";
                      const isNew = String(row.flag) === "new";

                      const rowTint = isUploaded
                        ? "bg-emerald-50/40"
                        : isNew
                          ? "bg-indigo-50/50"
                          : "";

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
                            rowTint,
                            selected.has(row._rid) ? "bg-slate-100" : "",
                          ].join(" ")}
                          onClick={(e) => {
                            const tag = String(
                              e.target?.tagName || "",
                            ).toLowerCase();
                            if (
                              tag === "input" ||
                              tag === "button" ||
                              tag === "select" ||
                              tag === "option" ||
                              tag === "svg" ||
                              tag === "path"
                            )
                              return;
                            openRow(row._rid);
                          }}
                        >
                          <td className="border-b border-slate-100 px-3 py-2">
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                                checked={selected.has(row._rid)}
                                onChange={(e) =>
                                  toggleOne(row._rid, e.target.checked)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <TruncInput
                              value={row.id}
                              placeholder="Id"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "id", e.target.value)
                              }
                            />
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <TruncInput
                              value={row.name}
                              placeholder="Name"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "name", e.target.value)
                              }
                            />
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <TruncInput
                              value={row.email}
                              placeholder="Email"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "email", e.target.value)
                              }
                            />
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <TruncInput
                              value={row.phoneNumber}
                              placeholder="010xxxxxxxx"
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() =>
                                setPhoneTouched((prev) => {
                                  const next = new Set(prev);
                                  next.add(row._rid);
                                  return next;
                                })
                              }
                              onChange={(e) =>
                                updateCell(
                                  row._rid,
                                  "phoneNumber",
                                  normalizePhone(e.target.value),
                                )
                              }
                              className={
                                showRed
                                  ? "border-rose-300 focus:ring-rose-100 focus:border-rose-300"
                                  : ""
                              }
                            />
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <TruncInput
                              value={row.dept}
                              placeholder="Dept"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "dept", e.target.value)
                              }
                            />
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <TruncInput
                              value={row.workTeam}
                              placeholder="Team"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "workTeam", e.target.value)
                              }
                            />
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <select
                              value={row.role ?? ""}
                              onChange={(e) =>
                                updateCell(row._rid, "role", e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className={[
                                "h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-[13px] outline-none transition",
                                "hover:border-slate-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300",
                                row.role ? "text-slate-900" : "text-slate-500",
                              ].join(" ")}
                            >
                              <option value="">-</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="PLANNER">PLANNER</option>
                              <option value="WORKER">WORKER</option>
                            </select>
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <TruncInput
                              type="date"
                              value={row.hireDate ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "hireDate", e.target.value)
                              }
                            />
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2">
                            <div className="h-10 flex items-center">
                              <StatusPill flag={row.flag} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <button
                            type="button"
                            onClick={addRow}
                            className="
                              w-full px-4 py-14 text-center
                              text-[13px] text-slate-500
                              hover:bg-indigo-50 focus:outline-none
                              focus:ring-2 focus:ring-indigo-200 cursor-pointer
                            "
                          >
                            <span className="font-semibold text-indigo-700">
                              클릭해서 행 추가
                            </span>{" "}
                            또는 XLS 업로드 해주세요.
                          </button>
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
