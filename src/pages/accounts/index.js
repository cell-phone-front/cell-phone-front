// src/pages/accounts/index.js
import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";
import { ArrowDownToLine, FileUp, X } from "lucide-react";

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

/** 서버 응답이 snake_case든 camelCase든 다 받아서 통일 */
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
    flag: r.flag ?? flag,
  };
}

function normalizeDate(v) {
  if (v == null || v === "") return "";

  // 엑셀 Serial Date(숫자) 처리
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

function Badge({ color, children }) {
  const map = {
    green: "bg-green-50 text-green-600 border-green-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    gray: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`
        inline-flex justify-center min-w-[64px]
        text-[11px] px-2 py-0.5 rounded-full
        border font-medium
        ${map[color] || map.gray}
      `}
    >
      {children}
    </span>
  );
}

/* ===============================
   input + ... + (옵션) hover 툴팁
   - Tasks 페이지 TruncInput 그대로
=============================== */
function TruncInput({
  value,
  onChange,
  placeholder,
  tooltip,
  onClick,
  className = "",
  alignRight = false,
  type = "text",
  onBlur,
}) {
  const v = value ?? "";
  return (
    <div className="group relative w-full">
      <input
        type={type}
        value={v}
        onChange={onChange}
        onClick={onClick}
        onBlur={onBlur}
        placeholder={placeholder}
        title={tooltip ? "" : String(v)}
        className={[
          "h-9 w-full rounded-md border px-3 bg-white text-sm outline-none transition",
          "hover:border-gray-300 focus:ring-2 focus:ring-gray-200",
          "truncate whitespace-nowrap overflow-hidden",
          alignRight ? "text-right" : "",
          className,
        ].join(" ")}
      />
      {tooltip ? (
        <div
          className="
            pointer-events-none
            absolute bottom-full left-0 mb-2
            hidden group-hover:block
            z-50
            max-w-[520px]
            rounded-lg border bg-white
            px-3 py-2 text-[12px] text-gray-800
            shadow-lg
            whitespace-pre-wrap break-words
          "
        >
          {String(v || "-")}
        </div>
      ) : null}
    </div>
  );
}

/* ===============================
   Row Detail (모달처럼, Portal + fixed)
   - 테이블/스크롤 절대 안 밀림
   - 아래 공간 부족하면 위로 flip
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

      // 1줄 바 높이
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

export default function AccountsPage() {
  const token = useToken((s) => s.token);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);

  // ✅ 검색
  const [query, setQuery] = useState("");

  const fileRef = useRef(null);

  // ✅ 모달 라인 열림 상태
  const [openRid, setOpenRid] = useState(null);
  const rowRefs = useRef({}); // rid -> tr element

  // ✅ 전화번호 touched(포커스 out 이후 빨강)
  const [phoneTouched, setPhoneTouched] = useState(() => new Set());

  useEffect(() => {
    if (!token) return;

    let alive = true;
    const t = setTimeout(() => {
      // getMembers가 query를 안 받는 구조면, 아래에서 프론트 필터만 쓰셔도 됩니다.
      // 여기서는 "getMembers(token)"로 받고 -> 아래 filteredData에서 검색합니다.
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
    }, 200);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [token]);

  // ✅ 프론트 검색(서버 검색으로 바꾸고 싶으면 getMembers(token, query)로 바꾸면 됨)
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

    // 저장 시점 검증(숫자만 기준)
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

  return (
    <DashboardShell crumbTop="관리" crumbCurrent="accounts">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-3 py-3">
        <div className="flex gap-4 items-center">
          <h2 className="text-2xl font-bold tracking-tight">Accounts</h2>
          <p className="mt-1 text-sm text-gray-500">
            행 추가/ 파일 업로드 후 저장됩니다.
          </p>
        </div>

        {/* 검색 */}
        <div className="relative mr-[10px]">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPageIndex(0);
            }}
            placeholder="검색 (Id/Name/Email/Phone/Dept/Team/Role/HireDate)"
            className="
              h-9 w-[320px] rounded-md border bg-white
              px-3 pr-8 text-[12px] outline-none transition
              hover:border-slate-300
              focus:ring-2 focus:ring-gray-200
              placeholder:text-[11px]
              placeholder:text-gray-400
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
                text-gray-400 transition
                hover:text-indigo-500 active:text-indigo-700
              "
              aria-label="clear"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          <span>총 {totalRows.toLocaleString()}건</span>
          <span className="mx-1 h-3 w-px bg-gray-400" />
          <span>선택 {selectedCount.toLocaleString()}건</span>
          <span className="mx-1 h-4 w-px" />

          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedCount === 0}
            className={[
              "h-9.5 rounded-md border px-5 text-sm transition",
              selectedCount === 0
                ? "bg-white text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                : "bg-white text-red-500 border-red-200 hover:bg-red-50 cursor-pointer",
            ].join(" ")}
          >
            선택 삭제
          </button>

          {loadError ? (
            <span className="ml-2 text-[12px] text-red-500">{loadError}</span>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={uploadHandle}
            className="flex items-center justify-center gap-2 text-slate-700 text-sm font-medium cursor-pointer"
          >
            <FileUp size={15} />
            <span>XLS 파일</span>
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
            onClick={addRow}
            className="
              h-9.5 rounded-md border border-gray-200 bg-white px-5 text-sm text-gray-600
              transition cursor-pointer font-medium
              hover:bg-gray-600 hover:text-white
              focus:outline-none focus:ring-1 focus:ring-gray-500
            "
          >
            + 행 추가
          </button>

          <button
            type="button"
            onClick={saveHandle}
            disabled={!dirty}
            className={`
              h-9 px-5 rounded-md border
              flex items-center gap-2 justify-center
              text-sm font-semibold
              transition-all duration-200
              focus:outline-none
              ${
                dirty
                  ? `
                    bg-indigo-600 text-white border-indigo-600
                    hover:bg-indigo-500 active:bg-indigo-700
                    active:scale-[0.97]
                    cursor-pointer shadow-sm
                    focus:ring-2 focus:ring-indigo-200
                  `
                  : `
                    bg-indigo-50 text-indigo-300 border-indigo-100
                    cursor-not-allowed
                  `
              }
            `}
          >
            <ArrowDownToLine size={16} className="shrink-0" />
            <span>저장</span>
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="px-4 pt-4">
        <div className="rounded-md bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
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
                <thead className="sticky top-0 z-10 bg-gray-600 text-white">
                  <tr className="text-left text-sm">
                    <th className="w-[44px] border-b border-slate-200 px-3 py-3">
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-pink-700"
                          checked={isAllPageSelected}
                          ref={(el) => {
                            if (!el) return;
                            el.indeterminate = isSomePageSelected;
                          }}
                          onChange={(e) => toggleAllPage(e.target.checked)}
                        />
                      </div>
                    </th>

                    <th className="w-[110px] border-b border-slate-200 px-3 py-3 font-medium">
                      Id
                    </th>
                    <th className="w-[120px] border-b border-slate-200 px-3 py-3 font-medium">
                      Name
                    </th>
                    <th className="w-[200px] border-b border-slate-200 px-3 py-3 font-medium">
                      Email
                    </th>
                    <th className="w-[140px] border-b border-slate-200 px-3 py-3 font-medium">
                      Phone
                    </th>
                    <th className="w-[150px] border-b border-slate-200 px-3 py-3 font-medium">
                      Department
                    </th>
                    <th className="w-[90px] border-b border-slate-200 px-3 py-3 font-medium">
                      Team
                    </th>
                    <th className="w-[120px] border-b border-slate-200 px-3 py-3 font-medium">
                      Role
                    </th>
                    <th className="w-[140px] border-b border-slate-200 px-3 py-3 font-medium">
                      Hire Date
                    </th>
                    <th className="w-[90px] border-b border-slate-200 px-3 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="text-sm">
                  {pageRows.map((row) => {
                    const isUploaded = row.flag === "pre";
                    const isNew = row.flag === "new";
                    const isOpen = openRid === row._rid;

                    const digits = normalizePhone(row.phoneNumber);
                    const touched = phoneTouched.has(row._rid);
                    const showRed =
                      touched && digits.length > 0 && digits.length !== 11;

                    return (
                      <tr
                        key={row._rid}
                        ref={(el) => {
                          if (el) rowRefs.current[row._rid] = el;
                        }}
                        className={[
                          "transition-colors hover:bg-gray-200 cursor-pointer",
                          selected.has(row._rid) ? "bg-gray-300" : "",
                          !selected.has(row._rid) && isOpen
                            ? "bg-indigo-50/40"
                            : "",
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
                        {/* checkbox */}
                        <td className="border-b border-slate-100 px-3 py-2">
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-pink-700 rounded cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-pink-200"
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
                            tooltip={false}
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
                            tooltip={false}
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
                            tooltip={false}
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
                            tooltip={false}
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
                            className={showRed ? "border-red-400" : ""}
                          />
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <TruncInput
                            value={row.dept}
                            placeholder="Dept"
                            tooltip={false}
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
                            tooltip={false}
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
                              "h-9 w-full rounded-md border bg-white px-2 text-sm",
                              row.role ? "" : "text-gray-500",
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
                            placeholder=""
                            tooltip={false}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateCell(row._rid, "hireDate", e.target.value)
                            }
                          />
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <div className="flex items-center">
                            {isUploaded ? (
                              <Badge color="green">Imported</Badge>
                            ) : isNew ? (
                              <Badge color="indigo">New</Badge>
                            ) : (
                              <Badge color="gray">Saved</Badge>
                            )}
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
                            w-full px-4 py-10 text-center text-sm text-gray-500
                            hover:bg-indigo-50 focus:outline-none
                            focus:ring-2 focus:ring-indigo-200 cursor-pointer
                          "
                        >
                          <span className="font-medium text-indigo-700">
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
          </div>
        </div>

        {/* 페이지네이션 footer (Tasks 스타일) */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageIndex === 0}
            className={[
              "h-8 px-3 text-[12px] rounded-md transition",
              pageIndex === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200 cursor-pointer",
            ].join(" ")}
          >
            이전
          </button>

          <div className="min-w-20 text-center text-[13px]">
            <span className="font-medium">{pageIndex + 1}</span>
            <span className="text-gray-500"> / {pageCount}</span>
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={pageIndex >= pageCount - 1}
            className={[
              "h-8 px-3 text-[12px] rounded-md transition",
              pageIndex >= pageCount - 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200 cursor-pointer",
            ].join(" ")}
          >
            다음
          </button>
        </div>
      </div>

      <div className="h-4" />
    </DashboardShell>
  );
}
