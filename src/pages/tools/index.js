import { getTools, postTools } from "@/api/tool-api";
import DashboardShell from "@/components/dashboard-shell";
import { useEffect, useMemo, useState } from "react";

export default function ToolsPage() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);

  // pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    getTools().then((json) => {
      const rows = (json.tools || []).map((r) => ({
        ...r,
        _rid: r._rid || cryptoId(),
        flag: r.flag ?? "Y",
      }));

      setData(rows);
      setSelected(new Set());
      setPageIndex(0);
      setDirty(false);
    });
  }, []);

  const totalRows = data.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, pageIndex, pageSize]);

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
  };

  const addRow = () => {
    setData((prev) => [
      {
        _rid: cryptoId(),
        flag: "new",
        id: "",
        name: "",
        description: "",
      },
      ...prev,
    ]);
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
  };

  const saveHandle = () => {
    const payload = data.map(({ _rid, flag, ...rest }) => rest);

    postTools(payload).then((ok) => {
      window.alert(ok ? "저장 완료" : "저장 실패");
      if (ok) setDirty(false);
    });
  };

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  return (
    <DashboardShell crumbTop="결과분석" crumbCurrent="tools">
      <div className="">
        <div className="">
          {/* ✅ 헤더: 제목 + 설명 */}
          <div className="flex items-center justify-between gap-4 px-3 py-3">
            <div className="flex justify-between gap-4 items-center">
              <h2 className="text-2xl font-bold tracking-tight">Tool</h2>
              <p className="mt-1 text-xs text-gray-500">
                툴 목록을 편집 후 저장할 수 있어요.
              </p>
            </div>
          </div>

          {/* ✅ 상단 바: 왼쪽(총/선택/삭제) + 오른쪽(+행추가/저장) */}
          <div className="flex items-center justify-between gap-3 px-4 py-1">
            {/* 왼쪽 */}
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

            {/* 오른쪽 */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={addRow}
                className="h-8 rounded-md border transition border-blue-200 text-blue-500 bg-white px-4 text-sm hover:bg-blue-50 cursor-pointer"
              >
                + 행 추가
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

          {/* ✅ 테이블 */}
          <div className="px-4 pt-4">
            <div className="">
              <div className="h-full overflow-auto bg-white">
                <table className="w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10  bg-slate-200">
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

                      <th className="min-w-45 border-b px-3 py-3 font-medium">
                        Tool ID
                      </th>
                      <th className="min-w-45 border-b px-3 py-3 font-medium">
                        Tool Name
                      </th>
                      <th className="min-w-95 border-b px-3 py-3 font-medium">
                        Description
                      </th>

                      <th className="min-w-25 border-b px-3 py-3 font-medium">
                        상태
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-sm">
                    {pageRows.map((row) => {
                      const isNew = row.flag === "new";

                      const rowBg = isNew ? "bg-blue-100/30" : "";

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

                          {/* Tool ID */}
                          <td className="border-b px-3 py-2">
                            <input
                              value={row.id ?? ""}
                              onChange={(e) =>
                                updateCell(row._rid, "id", e.target.value)
                              }
                              className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                              placeholder="Tool ID"
                            />
                          </td>

                          {/* Tool Name */}
                          <td className="border-b px-3 py-2">
                            <input
                              value={row.name ?? ""}
                              onChange={(e) =>
                                updateCell(row._rid, "name", e.target.value)
                              }
                              className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                              placeholder="Tool Name"
                            />
                          </td>

                          {/* Description */}
                          <td className="border-b px-3 py-2">
                            <input
                              value={row.description ?? ""}
                              onChange={(e) =>
                                updateCell(
                                  row._rid,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                              placeholder="Description"
                            />
                          </td>

                          {/* 상태 */}
                          <td className="border-b px-3 py-2">
                            <div className="flex items-center gap-2">
                              {isNew ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                  NEW
                                </span>
                              ) : (
                                <span className="text-[11px] px-4 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <button
                            type="button"
                            onClick={addRow}
                            className="w-full px-4 py-10 text-center text-sm text-gray-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer"
                          >
                            <span className="font-medium text-blue-700">
                              클릭해서 행 추가
                            </span>
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ✅ 페이지네이션: 오른쪽 아래 */}
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
          </div>

          <div className="h-4" />
        </div>
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
