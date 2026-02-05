import { useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";

import { getProducts, parseProductXLS, postProducts } from "@/api/product-api";

export default function Product() {
  const token = useToken((s) => s.token);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // ✅ 검색
  const [query, setQuery] = useState("");

  const fileRef = useRef();

  useEffect(() => {
    if (!token) return;

    getProducts(token)
      .then((json) => {
        const list = json.productList || json.items || json.data || [];
        setData(
          (list || []).map((r) => ({
            ...r,
            _rid: r._rid || cryptoId(),
            flag: r.flag ?? "Y",
          })),
        );
        setSelected(new Set());
        setPageIndex(0);
        setDirty(false);
      })
      .catch((err) => {
        console.error(err);
        window.alert(err?.message || "생산대상 조회 실패");
      });
  }, [token]);

  // ✅ 검색 필터 (id/brand/name/description)
  const filtered = useMemo(() => {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return data;

    return (data || []).filter((r) => {
      const id = String(r.id ?? "").toLowerCase();
      const brand = String(r.brand ?? "").toLowerCase();
      const name = String(r.name ?? r.productName ?? "").toLowerCase();
      const desc = String(r.description ?? r.desc ?? "").toLowerCase();
      return (
        id.includes(q) ||
        brand.includes(q) ||
        name.includes(q) ||
        desc.includes(q)
      );
    });
  }, [data, query]);

  const totalRows = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const safeIndex = Math.min(pageIndex, pageCount - 1);
    const start = safeIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageIndex, pageSize, pageCount]);

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
        id: "",
        brand: "",
        name: "",
        description: "",
        flag: "new",
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

    const payload = data.map(({ _rid, flag, ...rest }) => ({ ...rest }));

    postProducts(payload, token)
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
    if (fileRef.current) fileRef.current.click();
  };

  const fileChangeHandle = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!token) return;

    parseProductXLS(file, token)
      .then((json) => {
        const list = json.productList || json.items || json.data || [];
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
    <DashboardShell crumbTop="결과분석" crumbCurrent="product">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4 px-3 py-3">
        <div className="flex justify-between gap-4 items-center">
          <h2 className="text-2xl font-bold tracking-tight">Product</h2>
          <p className="mt-1 text-xs text-gray-500">
            엑셀 업로드/편집 후 저장할 수 있어요.
          </p>
        </div>
      </div>

      {/* 상단 바 + ✅ 검색 */}
      <div className="flex items-center justify-between gap-3 px-4">
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

        {/* ✅ 오른쪽: 검색 + 버튼들 */}
        <div className="ml-auto flex items-center gap-2">
          {/* ✅ 검색창 */}
          <div className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPageIndex(0);
              }}
              placeholder="검색 (ID/Brand/Name/Description)"
              className="h-8 w-[260px] rounded-md border bg-white px-3 pr-8 text-[12px] outline-none transition
        hover:border-slate-300
        focus:ring-2 focus:ring-indigo-200"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPageIndex(0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition
          hover:text-indigo-500 active:text-indigo-700"
                aria-label="clear"
              >
                ✕
              </button>
            ) : null}
          </div>

          {/* ✅ 행 추가 → Indigo 포인트 */}
          <button
            type="button"
            onClick={addRow}
            className="h-8 rounded-md border border-indigo-200 bg-white px-4 text-sm text-indigo-600
      transition cursor-pointer
      hover:bg-indigo-100 hover:text-indigo-700 font-medium
      active:bg-gray-100 active:text-indigo-700
      focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

          {/* XLS 업로드 → 기존 유지 */}
          <button
            type="button"
            onClick={uploadHandle}
            className="h-8 rounded-md border px-3 text-sm bg-white text-gray-700
      transition cursor-pointer
      hover:bg-green-700"
          >
            XLS 업로드
          </button>

          {/* ✅ 저장 → Indigo 메인 버튼 */}
          <button
            type="button"
            onClick={saveHandle}
            disabled={!dirty}
            className={`
    h-8 rounded-md border px-7 text-sm font-medium transition
    focus:outline-none
    ${
      dirty
        ? `
        bg-indigo-600 text-white border-indigo-600
        hover:bg-indigo-500 active:bg-indigo-700
        cursor-pointer
        focus:ring-2 focus:ring-indigo-200
        shadow-sm
      `
        : `
        bg-slate-200 text-slate-400 border-slate-200
        cursor-not-allowed
      `
    }
  `}
          >
            저장
          </button>
        </div>
      </div>

      {/* ✅ 테이블 (여기만 라운드 + shadow) */}
      <div className="px-4 pt-4">
        {/* ✅ 바깥 카드 */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          {/* ✅ 스크롤 영역 */}
          <div className="h-full overflow-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-indigo-700 text-white">
                <tr className="text-left text-sm">
                  <th className="w-[44px] border-b border-slate-200 px-3 py-3">
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

                  <th className="min-w-[160px] border-b border-slate-200 px-3 py-3 font-medium">
                    Id
                  </th>
                  <th className="min-w-[140px] border-b border-slate-200 px-3 py-3 font-medium">
                    Brand
                  </th>
                  <th className="min-w-[220px] border-b border-slate-200 px-3 py-3 font-medium">
                    Name
                  </th>
                  <th className="min-w-[420px] border-b border-slate-200 px-3 py-3 font-medium">
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

                  return (
                    <tr
                      key={row._rid}
                      className="transition-colors hover:bg-slate-200"
                    >
                      {/* 체크박스 */}
                      <td className="border-b border-slate-100 px-3 py-2">
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

                      {/* Id */}
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          value={row.id ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "id", e.target.value)
                          }
                          className="
       h-9 w-full rounded-md border px-3
              bg-white text-sm outline-none transition
              hover:border-indigo-500
              focus:ring-1 focus:ring-indigo-500
            "
                          placeholder="Id"
                        />
                      </td>

                      {/* Brand */}
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          value={row.brand ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "brand", e.target.value)
                          }
                          className="
               h-9 w-full rounded-md border px-3
              bg-white text-sm outline-none transition
              hover:border-indigo-500
              focus:ring-1 focus:ring-indigo-500
            "
                          placeholder="Brand"
                        />
                      </td>

                      {/* Name */}
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          value={row.name ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "name", e.target.value)
                          }
                          className="
              h-9 w-full rounded-md border px-3
              bg-white text-sm outline-none transition
              hover:border-indigo-500
              focus:ring-1 focus:ring-indigo-500
            "
                          placeholder="Name"
                        />
                      </td>

                      {/* Description */}
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          value={row.description ?? ""}
                          onChange={(e) =>
                            updateCell(row._rid, "description", e.target.value)
                          }
                          className="
               h-9 w-full rounded-md border px-3
              bg-white text-sm outline-none transition
              hover:border-indigo-500
              focus:ring-1 focus:ring-indigo-500
            "
                          placeholder="Description"
                        />
                      </td>

                      {/* Status */}
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex items-center">
                          {isUploaded ? (
                            <span
                              className="
                  inline-flex justify-center min-w-[64px]
                  text-[11px] px-2 py-0.5 rounded-full
                 bg-emerald-500 text-white
                  border border-emerald-200
                "
                            >
                              Imported
                            </span>
                          ) : isNew ? (
                            <span
                              className="
                  inline-flex justify-center min-w-[64px]
                  text-[11px] px-2 py-0.5 rounded-full
                  bg-indigo-500 text-white
                  border border-indigo-200
                "
                            >
                              New
                            </span>
                          ) : (
                            <span
                              className="
                  inline-flex justify-center min-w-[64px]
                  text-[11px] px-2 py-0.5 rounded-full
                  bg-gray-100 text-gray-700
                  border border-gray-200
                "
                            >
                              Saved
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

function cryptoId() {
  try {
    return (
      globalThis.crypto?.randomUUID?.() || `rid-${Date.now()}-${Math.random()}`
    );
  } catch {
    return `rid-${Date.now()}-${Math.random()}`;
  }
}
