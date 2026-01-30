// src/pages/tasks/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";
import { getTasks, parseTaskXLS, postTasks } from "@/api/task-api";

export default function TasksPage() {
  const token = useToken((s) => s.token);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);

  // pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fileRef = useRef(null);

  // 서버에서 목록 불러오기
  useEffect(() => {
    if (!token) return;

    let alive = true;

    getTasks(token)
      .then((json) => {
        if (!alive) return;

        const list = json?.taskList || json?.tasks || [];
        const rows = list.map((e) => ({
          ...e,
          _rid: e._rid || cryptoId(),
          flag: "Y",
          jobId: e.job?.id ?? e.jobId ?? "",
          toolId: e.tool?.id ?? e.toolId ?? "",
        }));

        setData(rows);
        setSelected(new Set());
        setPageIndex(0);
        setDirty(false);
      })
      .catch((err) => {
        console.error(err);
        window.alert(err?.message || "Tasks 불러오기 실패");
      });

    return () => {
      alive = false;
    };
  }, [token]);

  // ===== pagination 계산 =====
  const totalRows = data.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, pageIndex, pageSize]);

  // ===== selection 계산 =====
  const selectedCount = selected.size;

  const isAllPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r._rid));

  const isSomePageSelected =
    pageRows.some((r) => selected.has(r._rid)) && !isAllPageSelected;

  // ===== handlers =====
  const addRow = () => {
    const row = {
      _rid: cryptoId(),
      flag: "new",
      id: "",
      jobId: "",
      seq: "",
      name: "",
      description: "",
      toolId: "",
      duration: "",
    };
    setData((prev) => [row, ...prev]);
    setSelected(new Set());
    setPageIndex(0);
    setDirty(true);
  };

  const updateCell = (_rid, key, value) => {
    setData((prev) =>
      prev.map((r) => (r._rid === _rid ? { ...r, [key]: value } : r)),
    );
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

    const delCount = selected.size;

    setData((prev) => prev.filter((r) => !selected.has(r._rid)));
    setSelected(new Set());
    setDirty(true);

    // 페이지 인덱스 방어
    setPageIndex((p) => {
      const nextTotal = Math.max(0, totalRows - delCount);
      const nextPageCount = Math.max(1, Math.ceil(nextTotal / pageSize));
      return Math.min(p, nextPageCount - 1);
    });
  };

  const uploadHandle = () => {
    fileRef.current?.click();
  };

  const fileChangeHandle = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!token) return;

    parseTaskXLS(file, token)
      .then((json) => {
        const list = json?.taskList || json?.items || json?.tasks || [];
        const items = list.map((r) => ({
          ...r,
          _rid: cryptoId(),
          flag: "pre",
          jobId: r.job?.id ?? r.jobId ?? "",
          toolId: r.tool?.id ?? r.toolId ?? "",
        }));

        setData((prev) => [...items, ...prev]);
        setPageIndex(0);
        setSelected(new Set());
        setDirty(true);
      })
      .catch((err) => {
        console.error(err);
        window.alert(err?.message || "엑셀 파싱 실패");
      });

    e.target.value = "";
  };

  const saveHandle = () => {
    if (!token) return;

    // 서버에 보낼 payload에서 _rid / job / tool 같은 객체 제거
    const payload = data.map(({ _rid, job, tool, ...rest }) => rest);

    postTasks(payload, token)
      .then((ok) => {
        window.alert(ok ? "저장 완료" : "저장 실패");
        if (ok) setDirty(false);
      })
      .catch((err) => {
        console.error(err);
        window.alert(err?.message || "저장 실패");
      });
  };

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  return (
    <DashboardShell crumbTop="테이블" crumbCurrent="tasks">
      <div>
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4 px-3 py-3">
          <div className="flex justify-between gap-4 items-center">
            <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
            <p className="mt-1 text-xs text-gray-500">
              엑셀 업로드/편집 후 저장할 수 있어요.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4">
          {/* 왼쪽 그룹 */}
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
            <span>총 {totalRows.toLocaleString()}건</span>
            <span className="mx-1 h-4 w-px bg-gray-200" />
            <span>선택 {selectedCount.toLocaleString()}건</span>
            <span className="mx-1 h-4 w-px bg-gray-200" />

            <button
              type="button"
              onClick={deleteSelected}
              disabled={selectedCount === 0}
              className={[
                "h-8 rounded-md border px-3 text-sm transition",
                selectedCount === 0
                  ? "bg-white text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                  : "bg-white text-red-500 border-red-200 hover:bg-red-50 cursor-pointer",
              ].join(" ")}
            >
              선택 삭제
            </button>
          </div>

          {/* 오른쪽 그룹 */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="h-8 rounded-md border transition border-blue-200 text-blue-500 bg-white px-4 text-sm hover:bg-blue-50 cursor-pointer"
            >
              + 행 추가
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
              onClick={uploadHandle}
              className="h-8 rounded-md border px-3 text-sm bg-white hover:bg-gray-200 cursor-pointer transition"
            >
              XLS 업로드
            </button>

            <button
              type="button"
              onClick={saveHandle}
              disabled={!dirty}
              className={[
                "h-8 rounded-md border px-7 text-sm font-medium transition",
                dirty
                  ? "bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
                  : "bg-slate-200 text-slate-500 border-slate-200 cursor-not-allowed",
              ].join(" ")}
            >
              저장
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="px-4 pt-4">
          <div className="h-full overflow-auto bg-white">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr className="text-left text-sm">
                  <th className="w-11 border-b px-3 py-3">
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-black"
                        checked={isAllPageSelected}
                        ref={(el) => {
                          if (!el) return;
                          el.indeterminate = isSomePageSelected;
                        }}
                        onChange={(e) => toggleAllPage(e.target.checked)}
                      />
                    </div>
                  </th>

                  {/* ✅ 폭 재배치 */}
                  <th className="w-[200px] border-b px-3 py-3 font-medium">
                    Task Id
                  </th>
                  <th className="w-[140px] border-b px-3 py-3 font-medium">
                    Job Id
                  </th>
                  <th className="w-[80px] border-b px-3 py-3 font-medium">
                    Seq
                  </th>
                  <th className="w-[200px] border-b px-3 py-3 font-medium">
                    Name
                  </th>
                  <th className="w-[320px] border-b px-3 py-3 font-medium">
                    Description
                  </th>
                  <th className="w-[140px] border-b px-3 py-3 font-medium">
                    Tool Id
                  </th>

                  {/* Duration */}
                  <th className="w-24 border-b px-3 py-3 font-medium whitespace-nowrap">
                    Duration
                  </th>

                  <th className="w-[90px] border-b px-3 py-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {pageRows.map((row) => {
                  const isUploaded = row.flag === "pre";
                  const isNew = row.flag === "new";

                  const rowBg = isUploaded
                    ? "bg-green-100/10"
                    : isNew
                      ? "bg-blue-100/30"
                      : "";

                  return (
                    <tr
                      key={row._rid}
                      className={["hover:bg-slate-200/80", rowBg].join(" ")}
                    >
                      {/* 체크 */}
                      <td className="border-b px-3 py-2">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-black"
                            checked={selected.has(row._rid)}
                            onChange={(e) =>
                              toggleOne(row._rid, e.target.checked)
                            }
                          />
                        </div>
                      </td>

                      {/* Task Id */}
                      <td className="border-b px-3 py-2">
                        <input
                          value={row.id ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "id", e.target.value)
                          }
                          title={row.id ?? ""}
                          className="h-9 w-full rounded-md border px-2 font-medium outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                          placeholder="Task ID"
                        />
                      </td>

                      {/* Job Id */}
                      <td className="border-b px-3 py-2">
                        <input
                          value={row.jobId ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "jobId", e.target.value)
                          }
                          className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                          placeholder="Job ID"
                        />
                      </td>

                      {/* Seq */}
                      <td className="border-b px-3 py-2">
                        <input
                          value={row.seq ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "seq", e.target.value)
                          }
                          className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                          placeholder="Seq"
                        />
                      </td>

                      {/* Name */}
                      <td className="border-b px-3 py-2">
                        <input
                          value={row.name ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "name", e.target.value)
                          }
                          className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                          placeholder="Name"
                        />
                      </td>

                      {/* Description */}
                      <td className="border-b px-3 py-2">
                        <input
                          value={row.description ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "description", e.target.value)
                          }
                          className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                          placeholder="Description"
                        />
                      </td>

                      {/* Tool Id */}
                      <td className="border-b px-3 py-2">
                        <input
                          value={row.toolId ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "toolId", e.target.value)
                          }
                          className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                          placeholder="Tool ID"
                        />
                      </td>

                      {/* ✅ Duration */}
                      <td className="border-b px-3 py-2">
                        <input
                          value={row.duration ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "duration", e.target.value)
                          }
                          className="h-9 w-18 rounded-md border px-3 text-right outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                          placeholder="min"
                        />
                      </td>

                      {/* Status */}
                      <td className="border-b px-3 py-2">
                        <div className="flex items-center">
                          {isUploaded ? (
                            <span className="inline-flex justify-center min-w-[60px] text-center text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                              Imported
                            </span>
                          ) : isNew ? (
                            <span className="inline-flex justify-center min-w-[60px] text-center text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                              New
                            </span>
                          ) : (
                            <span className="inline-flex justify-center min-w-[60px] text-center text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
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
                    <td colSpan={9} className="p-0">
                      <button
                        type="button"
                        onClick={addRow}
                        className="w-full px-4 py-10 text-center text-sm text-gray-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer"
                      >
                        <span className="font-medium text-blue-700">
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

          {/* 페이지네이션 */}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={pageIndex === 0}
              className={[
                "h-8 px-3 text-[12px] rounded-md transition",
                pageIndex === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-200 active:font-medium cursor-pointer",
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
                  : "text-gray-700 hover:bg-gray-200 active:font-medium cursor-pointer",
              ].join(" ")}
            >
              다음
            </button>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </DashboardShell>
  );
}

function cryptoId() {
  try {
    return (
      globalThis.crypto?.randomUUID?.() || `rid-${Date.now()}-${Math.random()}`
    );
  } catch {
    return `rid-${Date.now()}-${Math.random()}`;
  }
}
