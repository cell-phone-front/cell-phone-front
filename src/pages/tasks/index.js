// src/pages/tasks/index.js
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
} from "lucide-react";

import { filterRows } from "@/lib/table-filter";
import { getTasks, parseTaskXLS, postTasks } from "@/api/task-api";

import TaskFullModal from "@/components/table-modal/tasks";
import TaskDetailPanel from "@/components/detail-panel/tasks";

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

function getTaskId(r) {
  return r?.id ?? r?.taskId ?? r?.task_id ?? "";
}

export default function TasksPage() {
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

  // ✅ keyword 기반: URL keyword / inputQuery 분리
  const [routerKeyword, setRouterKeyword] = useState("");
  const [inputQuery, setInputQuery] = useState("");

  // ✅ 상세
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const clearSelection = () => {
    setSelectedRow(null);
    setDetailOpen(false);
  };

  // ✅ 전체보기 모달
  const [fullOpen, setFullOpen] = useState(false);

  // ✅ router keyword/focus 반영
  const [focusId, setFocusId] = useState("");
  useEffect(() => {
    if (!router.isReady) return;

    const kw =
      router.query?.keyword != null ? String(router.query.keyword).trim() : "";
    const f =
      router.query?.focus != null ? String(router.query.focus).trim() : "";

    setRouterKeyword(kw);
    setInputQuery(kw); // ✅ 검색창에 표시
    setFocusId(f);
    setPageIndex(0);
  }, [router.isReady, router.query?.keyword, router.query?.focus]);

  // ✅ 데이터 로드 (서버는 전체 가져오고 프론트에서 필터링)
  useEffect(() => {
    if (!token) return;
    let alive = true;

    getTasks(token, "")
      .then((json) => {
        if (!alive) return;

        const list =
          json?.taskList || json?.tasks || json?.items || json?.data || [];
        const rows = (list || []).map((r) => ({
          ...r,
          _rid: r?._rid || cryptoId(),
          flag: r?.flag ?? "saved",

          id: r?.id ?? r?.taskId ?? r?.task_id ?? "",
          operationId: r?.operationId ?? r?.operation_id ?? "",
          machineId: r?.machineId ?? r?.machine_id ?? "",
          name: r?.name ?? r?.taskName ?? "",
          description: r?.description ?? r?.desc ?? "",
          duration: r?.duration ?? r?.time ?? "",
        }));

        setData(rows);
        setSelected(new Set());
        setPageIndex(0);
        setLoadError("");
        setDirty(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err?.message || "Tasks 불러오기 실패");
      });

    return () => {
      alive = false;
    };
  }, [token]);

  // ✅ focus가 있으면 해당 row 선택 + 상세 열기 (데이터 로드 후)
  useEffect(() => {
    if (!router.isReady) return;
    if (!focusId) return;
    if (!Array.isArray(data) || data.length === 0) return;

    const found = data.find((r) => String(getTaskId(r)) === String(focusId));
    if (!found) return;

    setSelectedRow(found);
    setDetailOpen(true);
  }, [router.isReady, focusId, data]);

  // ✅ keyword + inputQuery 합치기
  const effectiveFilter = `${routerKeyword} ${inputQuery}`.trim();

  const filtered = useMemo(() => {
    return filterRows(data, effectiveFilter, [
      (r) => r?.id,
      "operationId",
      "machineId",
      "name",
      "description",
      "duration",
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

  // ✅ width 합계 100%로 맞춤 (table-fixed에서 중요)
  const COLS = [
    { key: "check", w: "5%" },
    { key: "id", w: "12%" },
    { key: "operationId", w: "14%" },
    { key: "machineId", w: "14%" },
    { key: "name", w: "15%" },
    { key: "description", w: "22%" },
    { key: "duration", w: "8%" },
    { key: "status", w: "10%" },
  ];

  const ColGroup = () => (
    <colgroup>
      {COLS.map((c) => (
        <col key={c.key} style={{ width: c.w }} />
      ))}
    </colgroup>
  );

  const addRow = () => {
    const newRow = {
      _rid: cryptoId(),
      flag: "new",
      id: "",
      operationId: "",
      machineId: "",
      name: "",
      description: "",
      duration: "",
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

    postTasks(payload, token)
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

    parseTaskXLS(file, token)
      .then((json) => {
        const list =
          json?.taskList || json?.tasks || json?.items || json?.data || [];

        const items = (list || []).map((r) => ({
          ...r,
          _rid: cryptoId(),
          flag: "pre",
          id: r?.id ?? r?.taskId ?? r?.task_id ?? "",
          operationId: r?.operationId ?? r?.operation_id ?? "",
          machineId: r?.machineId ?? r?.machine_id ?? "",
          name: r?.name ?? r?.taskName ?? "",
          description: r?.description ?? r?.desc ?? "",
          duration: r?.duration ?? r?.time ?? "",
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

  const renderTable = () => (
    <div className="h-full flex flex-col min-h-0">
      {/* 헤더 */}
      <div className="shrink-0">
        <table className="w-full table-fixed border-collapse">
          <ColGroup />
          <thead>
            <tr className="text-left text-[13px]">
              <th className="border-b border-slate-200 bg-gray-200  px-3 py-3">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-white"
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (!el) return;
                      el.indeterminate = isSomePageSelected;
                    }}
                    onChange={(e) => toggleAllPage(e.target.checked)}
                  />
                </div>
              </th>

              <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                작업 코드
              </th>
              <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                공정 코드
              </th>
              <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                기계 품번
              </th>
              <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                작업 이름
              </th>
              <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                작업 설명
              </th>
              <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white text-right">
                작업 시간(분)
              </th>
              <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                상태
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* 바디 */}
      <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
        <table className="w-full table-fixed border-collapse">
          <ColGroup />
          <tbody className="text-[13px]">
            {pageRows.map((row) => {
              const isUploaded = row.flag === "pre";
              const isNew = row.flag === "new";
              const rowBg = isUploaded
                ? "bg-green-800/10"
                : isNew
                  ? "bg-indigo-300/30"
                  : "";

              const isActive = selectedRow?._rid === row._rid;

              return (
                <tr
                  key={row._rid}
                  className={[
                    "transition-colors cursor-pointer",
                    isActive ? "bg-gray-200" : "hover:bg-gray-200",
                    rowBg,
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
                  <td className="border-b border-slate-100 px-3 py-2">
                    <div
                      className="flex justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-indigo-700 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        checked={selected.has(row._rid)}
                        onChange={(e) => toggleOne(row._rid, e.target.checked)}
                      />
                    </div>
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2">
                    <input
                      value={row.id ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateCell(row._rid, "id", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 bg-white text-[13px] outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Task Id"
                    />
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2">
                    <input
                      value={row.operationId ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateCell(row._rid, "operationId", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 bg-white text-[13px] outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Operation Id"
                    />
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2">
                    <input
                      value={row.machineId ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateCell(row._rid, "machineId", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 bg-white text-[13px] outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Machine Id"
                    />
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2">
                    <input
                      value={row.name ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateCell(row._rid, "name", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 bg-white text-[13px] outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Name"
                    />
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2">
                    <input
                      value={row.description ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateCell(row._rid, "description", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 bg-white text-[13px] outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Description"
                    />
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2">
                    <input
                      value={row.duration ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateCell(row._rid, "duration", e.target.value)
                      }
                      className="h-9 w-full rounded-xl border px-3 bg-white text-[13px] outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Duration"
                    />
                  </td>

                  <td className="border-b border-slate-100 px-3 py-2">
                    <div className="flex items-center">
                      {row.flag === "pre" ? (
                        <span className="inline-flex justify-center min-w-[62px] text-[9px] px-2 py-1 rounded-full bg-green-700 text-white border border-green-200 font-semibold">
                          Imported
                        </span>
                      ) : row.flag === "new" ? (
                        <span className="inline-flex justify-center min-w-[62px] text-[9px] px-2 py-1 rounded-full bg-indigo-600 text-white border border-indigo-200 font-semibold">
                          New
                        </span>
                      ) : (
                        <span className="inline-flex justify-center min-w-[62px] text-[9px] px-2 py-1 rounded-full bg-gray-100 text-slate-600 border border-slate-200 font-semibold">
                          Saved
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-0">
                  <button
                    type="button"
                    onClick={addRow}
                    className="w-full px-4 py-14 text-center text-[12px] text-slate-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                  >
                    <span className="font-bold text-indigo-700">
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
  );

  return (
    <DashboardShell crumbTop="테이블" crumbCurrent="tasks">
      <div className="px-4 pt-4 w-full min-w-0 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[1280px] h-[calc(100vh-120px)] flex flex-col gap-4 min-h-0">
          <div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                  매칭 작업
                </h2>
                <p className="text-[11px] text-slate-500">
                  행 추가/ 파일 업로드 후 저장됩니다.
                </p>
              </div>

              {/* 검색 */}
              <div className="w-[445px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPageIndex(0);
                    }}
                    placeholder="검색 (이름/설명)"
                    className="
                      group flex flex-nowrap items-center gap-2
                      h-10 rounded-xl border border-slate-200
                      px-3 overflow-hidden transition
                      hover:border-slate-300
                      focus-within:ring-2 focus-within:ring-indigo-200
                    "
                  >
                    <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 shrink-0" />
                    <input
                      value={inputQuery}
                      onChange={(e) => {
                        const v = e.target.value;

                        // ✅ 사용자가 타이핑 시작하면 URL keyword/focus 제거 + routerKeyword 해제
                        if (
                          routerKeyword ||
                          router.query?.keyword ||
                          router.query?.focus
                        ) {
                          setRouterKeyword("");

                          const next = { ...router.query };
                          delete next.keyword;
                          delete next.focus;

                          router.replace(
                            { pathname: router.pathname, query: next },
                            undefined,
                            { shallow: true, scroll: false },
                          );
                        }

                        setInputQuery(v);
                        setPageIndex(0);
                      }}
                      className="
                        w-full min-w-0 text-[11px] outline-none bg-transparent
                        placeholder:text-slate-400 placeholder:text-[10px]
                      "
                      placeholder="검색 (Task/Operation/Machine/Name/Description)"
                    />

                    {(inputQuery || routerKeyword) && (
                      <button
                        type="button"
                        onClick={() => {
                          setInputQuery("");
                          setRouterKeyword("");
                          setPageIndex(0);
                          setSelected(new Set());
                          clearSelection();

                          const next = { ...router.query };
                          delete next.keyword;
                          delete next.focus;

                          router.replace(
                            { pathname: router.pathname, query: next },
                            undefined,
                            { shallow: true, scroll: false },
                          );
                        }}
                        className="shrink-0 text-slate-400 hover:text-indigo-600 text-sm px-1 transition"
                        aria-label="clear"
                        title="검색 초기화"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {loadError ? (
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                    {loadError}
                  </div>
                ) : null}
              </div>
            </div>

            {/* 카드 + 작업패널 */}
            <div className="mt-5 grid grid-cols-12 gap-3">
              <div className="col-span-8 grid grid-cols-4 gap-3 items-stretch">
                <div className="h-full rounded-2xl border bg-white p-4 shadow-sm ring-black/5 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      총 데이터
                    </div>
                    <span className="items-center text-[10px] text-slate-400">
                      rows
                    </span>
                  </div>
                  <div className="mt-1 text-3xl font-bold text-slate-900">
                    {totalRows.toLocaleString()}
                  </div>
                </div>

                <div className="h-full rounded-2xl border bg-white p-4 shadow-sm ring-black/5 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      선택
                    </div>
                    <span className="items-center text-[10px] text-slate-400">
                      rows
                    </span>
                  </div>
                  <div className="mt-1 text-3xl font-bold text-indigo-700">
                    {selectedCount.toLocaleString()}
                  </div>
                </div>

                <div className="h-full rounded-2xl border bg-white p-4 shadow-sm ring-black/5 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      변경 사항
                    </div>
                    <span className="items-center text-[10px] text-slate-400">
                      dirty
                    </span>
                  </div>
                  <div className="text-[23px] font-bold">
                    {dirty ? (
                      <span className="text-indigo-600">작업 중</span>
                    ) : (
                      <span className="text-slate-400">완료</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFullOpen(true)}
                  className="
                    h-full rounded-2xl border bg-white p-4 shadow-sm ring-black/5
                    text-left transition
                    hover:border-indigo-200 hover:bg-indigo-50/30
                    focus:outline-none focus:ring-2 focus:ring-indigo-200
                    flex flex-col justify-between
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      전체 보기
                    </div>
                    <span className="items-center text-[10px] text-slate-400">
                      modal
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-900 text-white">
                      <Maximize2 className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[12px] font-bold text-slate-900">
                        표 전체 열기
                      </div>
                      <div className="text-[10px] text-slate-500">
                        전체 데이터 확인
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="col-span-4">
                <div className="rounded-2xl border bg-white p-4 shadow-sm ring-black/5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      작업
                    </div>
                    <span className="items-center text-[10px] text-slate-400">
                      controls
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={deleteSelected}
                      disabled={selectedCount === 0}
                      className={[
                        "h-10 w-[96px] px-3",
                        "text-[12px] font-semibold transition",
                        "inline-flex items-center justify-center whitespace-nowrap",
                        selectedCount === 0
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-red-600 cursor-pointer",
                      ].join(" ")}
                    >
                      선택 삭제
                    </button>

                    <button
                      type="button"
                      onClick={uploadHandle}
                      className={[
                        "h-10 w-[110px] px-3",
                        "text-[12px] font-semibold text-slate-700",
                        "inline-flex items-center justify-center gap-2",
                        "transition cursor-pointer whitespace-nowrap",
                      ].join(" ")}
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
                      className={[
                        "h-10 w-[120px] rounded-md px-4",
                        "border border-indigo-200 bg-white",
                        "text-[11px] font-semibold text-indigo-600",
                        "transition hover:bg-indigo-800 hover:text-white",
                        "focus:outline-none focus:ring-1 focus:ring-indigo-800",
                        "whitespace-nowrap cursor-pointer",
                      ].join(" ")}
                    >
                      + 행 추가
                    </button>

                    <button
                      type="button"
                      onClick={saveHandle}
                      disabled={!dirty}
                      className={[
                        "h-10 w-[120px] rounded-md px-4",
                        "flex items-center gap-2 justify-center",
                        "text-[11px] font-semibold transition-all duration-200",
                        "focus:outline-none whitespace-nowrap",
                        dirty
                          ? [
                              "bg-indigo-900 text-white border border-indigo-800",
                              "hover:bg-indigo-700 active:bg-indigo-950",
                              "active:scale-[0.96] cursor-pointer shadow-md",
                              "focus:ring-2 focus:ring-indigo-300",
                            ].join(" ")
                          : "bg-indigo-50 text-indigo-300 border border-indigo-100 cursor-not-allowed",
                      ].join(" ")}
                      title={
                        dirty
                          ? "변경 사항을 저장합니다"
                          : "변경 사항이 없습니다"
                      }
                    >
                      <ArrowDownToLine size={16} className="shrink-0" />
                      <span>저장</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 테이블 + 상세패널 + 페이지네이션 */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div
              className="flex-1 min-h-0 grid grid-cols-[1fr_auto] gap-4"
              onMouseDown={() => clearSelection()}
            >
              <div
                className="min-w-0 min-h-0 rounded-2xl border bg-white shadow-sm ring-black/5 overflow-hidden flex flex-col"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {renderTable()}
              </div>

              <div className="min-h-0" onMouseDown={(e) => e.stopPropagation()}>
                <TaskDetailPanel
                  open={detailOpen}
                  row={selectedRow}
                  onToggle={() => setDetailOpen((v) => !v)}
                />
              </div>
            </div>

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
        </div>
      </div>

      <TaskFullModal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        token={token}
      />
    </DashboardShell>
  );
}
