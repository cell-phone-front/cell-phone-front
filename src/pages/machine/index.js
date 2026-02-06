// src/pages/machine/index.js
import DashboardShell from "@/components/dashboard-shell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToken } from "@/stores/account-store";
import { ArrowDownToLine, FileUp, Search } from "lucide-react";
import { getMachine, postMachine, parseMachineXLS } from "@/api/machine-api";

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

export default function MachinePage() {
  const token = useToken((s) => s.token);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState("");

  // pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);

  //  검색창
  const [query, setQuery] = useState("");

  const fileRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    let alive = true;

    getMachine(token, query) //
      .then((json) => {
        if (!alive) return;

        const list = json.machineList || json.items || json.data || [];
        const rows = (list || []).map((r) => ({
          ...r,
          _rid: r._rid || cryptoId(),
          flag: r.flag ?? "Y",
        }));

        setData(rows);
        setSelected(new Set());
        setPageIndex(0);
        setLoadError("");
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err?.message || "Machine 불러오기 실패");
      });

    return () => {
      alive = false;
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
        koreanName: "",
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
        const list = json.machineList || json.items || json.data || [];
        const items = (list || []).map((r) => ({
          ...r,
          _rid: cryptoId(),
          flag: "pre",
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

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  return (
    <DashboardShell crumbTop="테이블" crumbCurrent="machine">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight">Machine</h2>
          <p className="text-sm text-gray-500">
            행 추가/ 파일 업로드 후 저장됩니다.
          </p>
        </div>

        {/*  검색창  */}
        <div className="relative">
          {/* 돋보기 */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

          {/* 입력창 */}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPageIndex(0);
            }}
            placeholder="검색 (ID/Name/Description)"
            className="
      h-10 w-[400px] rounded-md border bg-white

      pl-9 pr-3  
      text-[12px]

      outline-none transition
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

      {/* ✅ 상단 바 */}
      <div className="flex items-center justify-between px-4">
        {/* 왼쪽 */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          <span>총 {totalRows.toLocaleString()}건</span>
          <span className="mx-1 h-3 w-px bg-gray-400" />
          <span>선택 {selectedCount.toLocaleString()}건</span>
          <span className="mx-1 h-3 w-px bg-gray-300" />

          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedCount === 0}
            className={[
              "h-9 rounded-md border px-5 text-sm transition",
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

        {/* 오른쪽 버튼들 */}
        <div className="flex items-center gap-3">
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
        h-9 rounded-md border border-indigo-200 bg-white px-5 text-sm text-indigo-600
        transition cursor-pointer font-medium
        hover:bg-indigo-800 hover:text-white
        focus:outline-none focus:ring-1 focus:ring-indigo-800
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
              bg-indigo-900 text-white border-indigo-800
              hover:bg-indigo-700
              active:bg-indigo-950
              active:scale-[0.96]
              cursor-pointer shadow-md
              focus:ring-2 focus:ring-indigo-300
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

      {/* ✅ 테이블 카드 */}
      <div className="px-3 pt-3">
        {/* 표라운드 */}
        <div className="rounded-md bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="h-full overflow-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-indigo-900 text-white">
                <tr className="text-left text-sm">
                  <th className="w-[44px] border-b border-slate-200 px-3 py-3">
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4  accent-pink-700"
                        checked={isAllPageSelected}
                        ref={(el) => {
                          if (!el) return;
                          el.indeterminate = isSomePageSelected;
                        }}
                        onChange={(e) => toggleAllPage(e.target.checked)}
                      />
                    </div>
                  </th>

                  <th className="min-w-[160px] border-b border-slate-200 px-3 py-3 font-medium">
                    Machine Id
                  </th>
                  <th className="min-w-[220px] border-b border-slate-200 px-3 py-3 font-medium">
                    Name
                  </th>
                  <th className="min-w-[520px] border-b border-slate-200 px-3 py-3 font-medium">
                    Description
                  </th>
                  <th className="min-w-[100px] border-b border-slate-200 px-3 py-3 font-medium">
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
                      ? "bg-indigo-50"
                      : "";

                  return (
                    <tr
                      key={row._rid}
                      className={[
                        "transition-colors hover:bg-gray-200",
                        rowBg,
                      ].join(" ")}
                    >
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            className=" h-4 w-4 accent-pink-700
                            rounded
                            cursor-pointer
                            hover:opacity-90
                            focus:outline-none focus:ring-2 focus:ring-pink-200"
                            checked={selected.has(row._rid)}
                            onChange={(e) =>
                              toggleOne(row._rid, e.target.checked)
                            }
                          />
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          value={row.id ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "id", e.target.value)
                          }
                          className="
                            h-9 w-full rounded-md border px-3
                            bg-white text-sm outline-none transition
                            hover:border-slate-300
                            focus:ring-2 focus:ring-gray-200
                          "
                          placeholder="Machine Id"
                        />
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          value={row.name ?? row.koreanName ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "name", e.target.value)
                          }
                          className="
                            h-9 w-full rounded-md border px-3
                            bg-white text-sm outline-none transition
                            hover:border-slate-300
                            focus:ring-2 focus:ring-gray-200
                          "
                          placeholder="Name"
                        />
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          value={row.description ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "description", e.target.value)
                          }
                          className="
                            h-9 w-full rounded-md border px-3
                            bg-white text-sm outline-none transition
                            hover:border-slate-300
                            focus:ring-2 focus:ring-gray-200
                          "
                          placeholder="Description"
                        />
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex items-center">
                          {isUploaded ? (
                            <span className="inline-flex justify-center min-w-[64px] text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-medium">
                              Imported
                            </span>
                          ) : isNew ? (
                            <span className="inline-flex justify-center min-w-[64px] text-[11px] px-2 py-0.5 rounded-full bg-indigo-600 text-white border border-indigo-200 font-medium">
                              New
                            </span>
                          ) : (
                            <span className="inline-flex justify-center min-w-[64px] text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 font-medium">
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
                    <td colSpan={5} className="p-0">
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

        {/* 페이지네이션 */}
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
