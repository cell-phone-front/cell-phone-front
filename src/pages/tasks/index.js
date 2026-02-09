// src/pages/tasks/index.js
import DashboardShell from "@/components/dashboard-shell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToken } from "@/stores/account-store";
import { ArrowDownToLine, FileUp, Search } from "lucide-react";
import { getTasks, parseTaskXLS, postTasks } from "@/api/task-api";

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

function isNumericString(v) {
  return typeof v === "string" && v.trim() !== "" && !isNaN(Number(v));
}

function normalizeTaskList(payload, flag) {
  const list =
    payload?.taskList ||
    payload?.tasks ||
    payload?.items ||
    payload?.data ||
    [];

  return (list || []).map((t) => {
    const operationId = t.operationId ?? t.operation?.id ?? "";
    const machineId = t.machineId ?? t.machine?.id ?? "";

    let duration = t.duration ?? 0;
    let description = t.description ?? "";

    if ((!duration || Number(duration) === 0) && isNumericString(description)) {
      duration = Number(description);
      description = "";
    }

    return {
      ...t,
      _rid: t._rid || cryptoId(),
      flag: t.flag ?? flag,
      operationId,
      machineId,
      duration: Number(duration) || 0,
      description,
    };
  });
}

export default function TasksPage() {
  const token = useToken((s) => s.token);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState("");

  // pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);

  // search
  const [query, setQuery] = useState("");

  const fileRef = useRef(null);

  // detail (Product/Operation과 동일 동작)
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    if (!token) return;

    let alive = true;

    const t = setTimeout(() => {
      getTasks(token, query)
        .then((json) => {
          if (!alive) return;

          const rows = normalizeTaskList(json, "Y");
          setData(rows);
          setSelected(new Set());
          setPageIndex(0);
          setDirty(false);
          setLoadError("");

          // 검색/조회로 리스트가 바뀌면 상세는 닫기
          setSelectedRow(null);
          setDetailOpen(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadError(err?.message || "Tasks 불러오기 실패");
        });
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [token, query]);

  // pagination calc
  const totalRows = data.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const safeIndex = Math.min(pageIndex, pageCount - 1);
    const start = safeIndex * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, pageIndex, pageSize, pageCount]);

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
      prev.map((r) => {
        if (r._rid !== rowRid) return r;
        if (key === "duration") {
          return { ...r, duration: Number(value) || 0 };
        }
        return { ...r, [key]: value };
      }),
    );
    setDirty(true);

    // 상세에 떠있는 행을 수정하면 상세도 같이 갱신
    setSelectedRow((prev) =>
      prev && prev._rid === rowRid
        ? key === "duration"
          ? { ...prev, duration: Number(value) || 0 }
          : { ...prev, [key]: value }
        : prev,
    );
  };

  const COLS = [
    { key: "check", w: "4%" },
    { key: "id", w: "13%" },
    { key: "operationId", w: "14%" },
    { key: "machineId", w: "14%" },
    { key: "name", w: "14%" },
    { key: "desc", w: "20%" },
    { key: "duration", w: "7%" },
    { key: "status", w: "7%" },
  ];

  const ColGroup = () => (
    <colgroup>
      {COLS.map((c) => (
        <col key={c.key} style={{ width: c.w }} />
      ))}
    </colgroup>
  );

  const addRow = () => {
    const row = {
      _rid: cryptoId(),
      flag: "new",
      id: "",
      operationId: "",
      machineId: "",
      name: "",
      duration: 0,
      description: "",
    };

    setData((prev) => [row, ...prev]);
    setSelected(new Set());
    setPageIndex(0);
    setDirty(true);

    // 요구사항: 행추가로는 상세 자동 오픈 X
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;

    setData((prev) => prev.filter((r) => !selected.has(r._rid)));
    setSelected(new Set());
    setPageIndex(0);
    setDirty(true);

    // 상세가 삭제된 행을 보고 있었다면 닫기
    setSelectedRow((prev) => {
      if (!prev) return prev;
      return selected.has(prev._rid) ? null : prev;
    });

    if (selectedRow && selected.has(selectedRow._rid)) {
      setDetailOpen(false);
    }
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
        const items = normalizeTaskList(json, "pre");
        setData((prev) => [...items, ...prev]);
        setPageIndex(0);
        setSelected(new Set());
        setDirty(true);
        setLoadError("");

        // 요구사항: 업로드로는 상세 자동 오픈 X
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err?.message || "엑셀 파싱 실패");
      });

    e.target.value = "";
  };

  const saveHandle = () => {
    if (!token) {
      window.alert("토큰이 없어서 저장할 수 없어요. 다시 로그인 해주세요.");
      return;
    }

    const payload = data.map((r) => {
      const { _rid, operation, machine, ...rest } = r;
      return {
        ...rest,
        operationId: r.operationId,
        machineId: r.machineId,
        duration: Number(r.duration) || 0,
      };
    });

    postTasks(payload, token)
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

  return (
    <DashboardShell crumbTop="테이블" crumbCurrent="tasks">
      <div className="px-4 pt-4 h-[calc(100vh-120px)] flex flex-col gap-4">
        {/* ===== 상단 카드 ===== */}
        <div>
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Tasks
              </h2>
              <p className="text-[12px] text-slate-500">
                행 추가/ 파일 업로드 후 저장됩니다.
              </p>
            </div>

            <div className="w-[340px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPageIndex(0);
                  }}
                  placeholder="검색 (Task/Operation/Machine/Name/Description)"
                  className="
                    h-10 w-full rounded-xl border
                    pl-9 pr-9 text-[12px]
                    outline-none transition
                    hover:border-slate-300
                    focus:ring-2 focus:ring-indigo-200
                    placeholder:text-[11px]
                    placeholder:text-slate-400
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
                      h-7 w-7 rounded-lg
                      text-slate-400 transition
                      hover:bg-slate-100 hover:text-indigo-700
                      active:bg-slate-200
                    "
                    aria-label="clear"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              {loadError ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {loadError}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 총 데이터 */}
              <div className="rounded-2xl border bg-white p-4 shadow-sm ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] font-semibold text-slate-500">
                    총 데이터
                  </div>
                  <span className="items-center text-[11px] text-slate-400">
                    rows
                  </span>
                </div>
                <div className="mt-1 text-3xl font-extrabold text-slate-900">
                  {totalRows.toLocaleString()}
                </div>
              </div>

              {/* 선택됨 */}
              <div className="rounded-2xl border bg-white p-4 shadow-sm ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] font-semibold text-slate-500">
                    선택됨
                  </div>
                  <span className="items-center text-[11px] text-slate-400">
                    rows
                  </span>
                </div>
                <div className="mt-1 text-3xl font-extrabold text-indigo-700">
                  {selectedCount.toLocaleString()}
                </div>
              </div>

              {/* 변경 사항 */}
              <div className="rounded-2xl border bg-white p-4 shadow-sm  ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] font-semibold text-slate-500">
                    변경 사항
                  </div>

                  <span className="items-center text-[11px] text-slate-400">
                    dirty
                  </span>
                </div>

                <div className="mt-2 text-2xl font-extrabold">
                  {dirty ? (
                    <span className="text-indigo-600">작업 중</span>
                  ) : (
                    <span className="text-slate-400">완료</span>
                  )}
                </div>
              </div>
            </div>

            {/* 액션 패널 */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border bg-white p-4 shadow-sm ring-black/5 h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] font-semibold text-slate-500">
                    작업
                  </div>
                  <span className="items-center text-[11px] text-slate-400">
                    controls
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2 w-full">
                  {/* 선택 삭제 */}
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

                  {/* XLS */}
                  <button
                    type="button"
                    onClick={uploadHandle}
                    className={[
                      "h-10 w-[110px] px-3",
                      "text-[12px] font-semibold text-slate-700",
                      "inline-flex items-center justify-center gap-2",
                      "transition cursor-pointer",
                      "whitespace-nowrap",
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

                  {/* 행 추가 */}
                  <button
                    type="button"
                    onClick={addRow}
                    className={[
                      "h-10 w-[120px] rounded-md px-4",
                      "border border-indigo-200 bg-white",
                      "text-[12px] font-semibold text-indigo-600",
                      "transition hover:bg-indigo-800 hover:text-white",
                      "focus:outline-none focus:ring-1 focus:ring-indigo-800",
                      "whitespace-nowrap cursor-pointer",
                    ].join(" ")}
                  >
                    + 행 추가
                  </button>

                  {/* 저장 */}
                  <button
                    type="button"
                    onClick={saveHandle}
                    disabled={!dirty}
                    className={[
                      "h-10 w-[120px] rounded-md px-4",
                      "flex items-center gap-2 justify-center",
                      "text-[12px] font-semibold transition-all duration-200",
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
                      dirty ? "변경 사항을 저장합니다" : "변경 사항이 없습니다"
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

        {/* ===== 테이블 + 상세패널 ===== */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            {/* ===== 테이블 카드 ===== */}
            <div className="rounded-2xl border bg-white shadow-sm ring-black/5 overflow-hidden flex min-h-0 flex-col">
              {/* 헤더 */}
              <div className="shrink-0">
                <table className="w-full table-fixed border-collapse">
                  <ColGroup />
                  <thead>
                    <tr className="text-left text-sm">
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 text-white">
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
                        Task Id
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                        Operation Id
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                        Machine Id
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                        Name
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                        Description
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white text-right">
                        Duration
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-semibold text-white">
                        Status
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>

              {/* 바디 */}
              <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
                <table className="w-full table-fixed border-collapse">
                  <ColGroup />
                  <tbody className="text-sm">
                    {pageRows.map((row) => {
                      const isUploaded = row.flag === "pre";
                      const isNew = row.flag === "new";

                      const rowBg = isUploaded
                        ? "bg-green-900/10"
                        : isNew
                          ? "bg-indigo-900/10"
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
                                className="h-4 w-4 accent-indigo-700 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                checked={selected.has(row._rid)}
                                onChange={(e) =>
                                  toggleOne(row._rid, e.target.checked)
                                }
                              />
                            </div>
                          </td>

                          {/* task id */}
                          <td className="border-b border-slate-100 px-3 py-2">
                            <input
                              value={row.id ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "id", e.target.value)
                              }
                              className="h-9 w-full rounded-xl border px-3 bg-white text-sm outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                              placeholder="Task Id"
                            />
                          </td>

                          {/* operation id */}
                          <td className="border-b border-slate-100 px-3 py-2">
                            <input
                              value={row.operationId ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(
                                  row._rid,
                                  "operationId",
                                  e.target.value,
                                )
                              }
                              className="h-9 w-full rounded-xl border px-3 bg-white text-sm outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                              placeholder="Operation Id"
                            />
                          </td>

                          {/* machine id */}
                          <td className="border-b border-slate-100 px-3 py-2">
                            <input
                              value={row.machineId ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(
                                  row._rid,
                                  "machineId",
                                  e.target.value,
                                )
                              }
                              className="h-9 w-full rounded-xl border px-3 bg-white text-sm outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                              placeholder="Machine Id"
                            />
                          </td>

                          {/* name */}
                          <td className="border-b border-slate-100 px-3 py-2">
                            <input
                              value={row.name ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "name", e.target.value)
                              }
                              className="h-9 w-full rounded-xl border px-3 bg-white text-sm outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                              placeholder="Name"
                            />
                          </td>

                          {/* description */}
                          <td className="border-b border-slate-100 px-3 py-2">
                            <input
                              value={row.description ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(
                                  row._rid,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="h-9 w-full rounded-xl border px-3 bg-white text-sm outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200"
                              placeholder="Description"
                            />
                          </td>

                          {/* duration */}
                          <td className="border-b border-slate-100 px-3 py-2">
                            <input
                              value={String(row.duration ?? 0)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateCell(row._rid, "duration", e.target.value)
                              }
                              className="h-9 w-full rounded-xl border px-3 bg-white text-sm outline-none transition hover:border-slate-300 focus:ring-2 focus:ring-indigo-200 text-right"
                              placeholder="0"
                            />
                          </td>

                          {/* status */}
                          <td className="border-b border-slate-100 px-3 py-2">
                            <div className="flex items-center">
                              {isUploaded ? (
                                <span className="inline-flex justify-center min-w-[74px] text-[11px] px-2 py-1 rounded-full bg-green-700 text-white border border-green-200 font-semibold">
                                  Imported
                                </span>
                              ) : isNew ? (
                                <span className="inline-flex justify-center min-w-[74px] text-[11px] px-2 py-1 rounded-full bg-indigo-600 text-white border border-indigo-200 font-semibold">
                                  New
                                </span>
                              ) : (
                                <span className="inline-flex justify-center min-w-[74px] text-[11px] px-2 py-1 rounded-full bg-gray-100 text-slate-600 border border-slate-200 font-semibold">
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
                            className="w-full px-4 py-16 text-center text-[12px] text-slate-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                          >
                            <span className="font-extrabold text-indigo-700">
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

            {/* ===== 상세 패널 ===== */}
            <TaskDetailPanel
              open={detailOpen}
              row={selectedRow}
              onToggle={() => setDetailOpen((v) => !v)}
            />
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-end gap-1 px-1 py-5">
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
      </div>
    </DashboardShell>
  );
}
