// src/pages/machine/index.js
import DashboardShell from "@/components/dashboard-shell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToken } from "@/stores/account-store";
import { useRouter } from "next/router";
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Search,
  Maximize2,
  Trash2,
  Plus,
  X,
  Layers,
  CheckCircle,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

import { filterRows } from "@/lib/table-filter";
import { getMachine, postMachine, parseMachineXLS } from "@/api/machine-api";

import MachineFullModal from "@/components/table-modal/machine";
import MachineDetailPanel from "@/components/detail-panel/machine";

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

function safeStr(v) {
  return String(v ?? "").trim();
}

function normalizeMachineList(payload) {
  const list =
    payload?.machineList ||
    payload?.machines?.machineList ||
    payload?.machines ||
    payload?.items ||
    payload?.data ||
    payload?.machine ||
    [];

  const arr = Array.isArray(list) ? list : list ? [list] : [];

  return (arr || []).map((m) => ({
    ...m,
    _rid: m._rid || cryptoId(),
    flag: m.flag ?? "saved",

    id:
      m.id ??
      m.machineId ??
      m.machine_id ??
      m.machineID ??
      m.machineNo ??
      m.machine_no ??
      "",
    name: m.name ?? m.machineName ?? m.machine_name ?? m.machineNM ?? "",
    koreanName: m.koreanName ?? m.korean_name ?? m.machineKoreanName ?? "",
    description: m.description ?? m.desc ?? m.machineDesc ?? "",
  }));
}

function StatusPill({ flag }) {
  const f = String(flag || "");
  const map =
    f === "pre"
      ? {
          label: "IMPORTED",
          cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2.5",
        }
      : f === "new"
        ? {
            label: "NEW",
            cls: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-6",
          }
        : {
            label: "SAVED",
            cls: "bg-slate-50 text-slate-700 ring-1 ring-slate-200 px-5",
          };

  return (
    <span
      className={[
        "inline-flex items-center justify-center",
        "h-5 rounded-full",
        "text-[10px] font-medium whitespace-nowrap",
        map.cls,
      ].join(" ")}
    >
      {map.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  sub,
  tone = "indigo",
  icon = null,
  valueClass = "",
}) {
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

          <div
            className={[
              "mt-1 tabular-nums text-slate-900",
              valueClass ? valueClass : "text-[25px] font-semibold",
            ].join(" ")}
          >
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
          {icon ? icon : <ClipboardList className="h-4 w-4" />}
        </div>
      </div>
    </div>
  );
}

function TruncInput({ value, onChange, placeholder, onClick, className = "" }) {
  return (
    <input
      value={value ?? ""}
      onClick={onClick}
      onChange={onChange}
      placeholder={placeholder}
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white",
        "px-3 text-[13px] outline-none transition",
        "hover:border-slate-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300",
        "truncate whitespace-nowrap overflow-hidden",
        className,
      ].join(" ")}
    />
  );
}

export default function MachinePage() {
  const token = useToken((s) => s.token);
  const router = useRouter();
  const fileRef = useRef(null);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState("");

  // pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);

  // search (페이지 검색창 전용)
  const [query, setQuery] = useState("");

  // 통합검색(라우터) 전용 (Tasks와 동일: query와 분리)
  const [routerFocus, setRouterFocus] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    const focus = router.query?.focus != null ? String(router.query.focus) : "";
    const keyword =
      router.query?.keyword != null ? String(router.query.keyword) : "";

    const next = (focus || keyword).trim();
    setRouterFocus(next);
    setPageIndex(0);
  }, [router.isReady, router.query?.focus, router.query?.keyword]);

  // 전체보기 모달
  const [fullOpen, setFullOpen] = useState(false);

  // 상세 패널
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const clearSelection = () => {
    setSelectedRow(null);
    setDetailOpen(false);
  };

  /* =========================
   * load
   ========================= */
  useEffect(() => {
    if (!token) return;

    let alive = true;

    // Tasks처럼: 일단 전체 로드 → 프론트 필터
    getMachine(token, "")
      .then((json) => {
        if (!alive) return;

        const rows = normalizeMachineList(json);
        setData(rows);

        setSelected(new Set());
        setPageIndex(0);
        setLoadError("");
        setDirty(false);

        setSelectedRow(null);
        setDetailOpen(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err?.message || "Machine 불러오기 실패");
      });

    return () => {
      alive = false;
    };
  }, [token]);

  /* =========================
   * filters (AND)
   ========================= */
  const effectiveFilter = `${routerFocus} ${query}`.trim();

  const filtered = useMemo(() => {
    return filterRows(data, effectiveFilter, [
      (r) => r?.id,
      "name",
      "koreanName",
      "description",
    ]);
  }, [data, effectiveFilter]);

  // pagination calc
  const totalRows = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const safeIndex = Math.min(pageIndex, pageCount - 1);
    const start = safeIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageIndex, pageSize, pageCount]);

  // selection calc
  const selectedCount = selected.size;

  const isAllPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r._rid));

  const isSomePageSelected =
    pageRows.some((r) => selected.has(r._rid)) && !isAllPageSelected;

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

  const toggleOne = (_rid, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(_rid);
      else next.delete(_rid);
      return next;
    });
  };

  const updateCell = (rowRid, key, value) => {
    setData((prev) =>
      prev.map((r) => (r._rid === rowRid ? { ...r, [key]: value } : r)),
    );
    setDirty(true);

    setSelectedRow((prev) =>
      prev && prev._rid === rowRid ? { ...prev, [key]: value } : prev,
    );
  };

  const addRow = () => {
    const newRow = {
      _rid: cryptoId(),
      flag: "new",
      id: "",
      name: "",
      koreanName: "",
      description: "",
    };

    setData((prev) => [newRow, ...prev]);
    setPageIndex(0);
    setSelected(new Set());
    setDirty(true);
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;

    setData((prev) => prev.filter((r) => !selected.has(r._rid)));
    setSelected(new Set());
    setPageIndex(0);
    setDirty(true);

    setSelectedRow((prev) => {
      if (!prev) return prev;
      return selected.has(prev._rid) ? null : prev;
    });

    if (selectedRow && selected.has(selectedRow._rid)) {
      setDetailOpen(false);
    }
  };

  const saveHandle = () => {
    if (!token) {
      window.alert("토큰이 없어서 저장할 수 없어요. 다시 로그인 해주세요.");
      return;
    }

    const payload = data.map(({ _rid, flag, ...rest }) => rest);

    postMachine(payload, token)
      .then(() => {
        window.alert("저장 완료");
        setDirty(false);
      })
      .catch((err) => {
        console.error(err);
        window.alert(err?.message || "저장 실패");
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

    parseMachineXLS(file, token)
      .then((json) => {
        const list = normalizeMachineList(json);
        const items = (list || []).map((r) => ({
          ...r,
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
        window.alert(err?.message || "엑셀 파싱 실패");
      });

    e.target.value = "";
  };

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  const clearSearchAll = () => {
    setQuery("");
    setRouterFocus("");
    setPageIndex(0);

    const nextQuery = { ...router.query };
    delete nextQuery.focus;
    delete nextQuery.keyword;

    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });
  };

  return (
    <DashboardShell crumbTop="테이블" crumbCurrent="machine">
      <div className="px-4 pt-4 w-full min-w-0 overflow-x-auto overflow-y-hidden">
        {/* ✅ Tasks와 동일 높이 고정 */}
        <div className="min-w-[1280px] h-[calc(100vh-120px)] flex flex-col gap-4 pb-6">
          {/* ===== 상단 카드 (Tasks 톤) ===== */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4">
              {/* title row */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-sm shrink-0">
                      <span className="text-[14px] font-black">M</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[18px] font-black text-slate-900 truncate">
                          기계
                        </div>

                        {dirty ? (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            변경됨
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                            최신
                          </span>
                        )}
                      </div>

                      <div className="text-[12px] text-slate-500 truncate">
                        행 추가/파일 업로드/수정 후 저장하면 서버에 반영됩니다.
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
                      placeholder="검색 (기계/이름/설명)"
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

                    {query || routerFocus ? (
                      <button
                        type="button"
                        onClick={clearSearchAll}
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
                    onClick={() => setFullOpen(true)}
                    className="
                      h-10 px-4 rounded-full
                      border border-slate-200 bg-white
                      text-[13px] font-semibold text-slate-700
                      hover:bg-slate-50
                      inline-flex items-center gap-2
                    "
                    title="표 전체 열기"
                  >
                    <Maximize2 size={15} />
                    전체 보기
                  </button>

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
                    title={
                      dirty ? "변경 사항을 저장합니다" : "변경 사항이 없습니다"
                    }
                  >
                    <ArrowDownToLine size={16} className="shrink-0" />
                    저장
                  </button>
                </div>
              </div>

              {/* stat cards + work panel */}
              <div className="mt-4 grid grid-cols-12 gap-3">
                <div className="col-span-8 grid grid-cols-4 gap-3">
                  <StatCard
                    title="TOTAL"
                    value={totalRows.toLocaleString()}
                    sub="검색 조건이 적용된 전체"
                    tone="slate"
                    icon={<Layers className="h-4 w-4" />}
                  />

                  <StatCard
                    title="SELECTED"
                    value={selectedCount.toLocaleString()}
                    sub="체크된 행"
                    tone="indigo"
                    icon={<CheckCircle className="h-4 w-4" />}
                  />

                  <StatCard
                    title="DIRTY"
                    value={dirty ? "작업 중" : "완료"}
                    sub="변경 상태"
                    tone={dirty ? "amber" : "slate"}
                    icon={<AlertCircle className="h-4 w-4" />}
                    valueClass="pt-1.5 pb-1.5 text-[18px] font-bold text-slate-800"
                  />

                  <StatCard
                    title="DETAIL"
                    value={detailOpen && selectedRow ? "열림" : "닫힘"}
                    sub="우측 패널"
                    tone="emerald"
                    icon={<ClipboardList className="h-4 w-4" />}
                    valueClass="pt-1.5 pb-1.5 text-[18px] font-semibold text-slate-800"
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
                    </div>

                    {loadError ? (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                        {loadError}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 테이블 + 상세패널 ===== */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div
              className="flex-1 min-h-0 grid grid-cols-[1fr_auto] gap-4 items-stretch"
              onMouseDown={() => {
                clearSelection();
              }}
            >
              {/* Table card */}
              <div
                className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex min-h-0 flex-col"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* head */}
                <div className="shrink-0">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: "44px" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "26%" }} />
                      <col style={{ width: "120px" }} />
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
                          기계 품번
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          기계 이름
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          기계 이름(KR)
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          기계 설명
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          상태
                        </th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* body */}
                <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: "44px" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "26%" }} />
                      <col style={{ width: "120px" }} />
                    </colgroup>

                    <tbody className="text-[13px]">
                      {pageRows.map((row) => {
                        const isUploaded = row.flag === "pre";
                        const isNew = row.flag === "new";

                        const rowTint = isUploaded
                          ? "bg-emerald-50/40"
                          : isNew
                            ? "bg-indigo-50/50"
                            : "";

                        const isActive = selectedRow?._rid === row._rid;

                        return (
                          <tr
                            key={row._rid}
                            className={[
                              "group transition-colors cursor-pointer",
                              isActive
                                ? "bg-indigo-50/60"
                                : "hover:bg-indigo-50/40",
                              rowTint,
                            ].join(" ")}
                            onClick={() => {
                              if (selectedRow?._rid === row._rid) {
                                clearSelection();
                                return;
                              }
                              setSelectedRow(row);
                              setDetailOpen(true);
                            }}
                          >
                            {/* check */}
                            <td className="border-b border-slate-100 px-3 py-2">
                              <div
                                className="flex justify-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                                  checked={selected.has(row._rid)}
                                  onChange={(e) =>
                                    toggleOne(row._rid, e.target.checked)
                                  }
                                />
                              </div>
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2">
                              <TruncInput
                                value={row.id ?? ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  updateCell(row._rid, "id", e.target.value)
                                }
                                placeholder="Machine Id"
                              />
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2">
                              <TruncInput
                                value={row.name ?? ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  updateCell(row._rid, "name", e.target.value)
                                }
                                placeholder="Name"
                              />
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2">
                              <TruncInput
                                value={row.koreanName ?? ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  updateCell(
                                    row._rid,
                                    "koreanName",
                                    e.target.value,
                                  )
                                }
                                placeholder="Korean Name"
                              />
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2">
                              <TruncInput
                                value={row.description ?? ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  updateCell(
                                    row._rid,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="Description"
                              />
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2">
                              <div className="h-10 flex items-center">
                                <StatusPill
                                  flag={
                                    isUploaded ? "pre" : isNew ? "new" : "saved"
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {pageRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-0">
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

                {/* table footer (Tasks와 동일 톤) */}
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

              {/* Detail panel (높이 고정 + 내부 스크롤) */}
              <div
                className="h-full min-h-0 flex"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <MachineDetailPanel
                  open={detailOpen}
                  row={selectedRow}
                  onToggle={() => setDetailOpen((v) => !v)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MachineFullModal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        token={token}
      />
    </DashboardShell>
  );
}
