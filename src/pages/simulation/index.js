// pages/simulation/index.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import DashboardShell from "@/components/dashboard-shell";
import { useAccount, useToken } from "@/stores/account-store";

import {
  getSimulations,
  createSimulation,
  runSimulation,
  deleteSimulation,
  getSimulationMetaJson,
} from "@/api/simulation-api";
import SimulationCreateDrawer from "@/components/simulation/simulation-create-drawer";

import { getProducts } from "@/api/product-api";

import { Spinner } from "@/components/ui/spinner";
import { Play, Check, Plus, Search, Trash2 } from "lucide-react";

function fmtDate(v) {
  if (!v) return "-";
  const s = String(v);
  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];
  return s.slice(0, 10);
}

function roleOk(role) {
  const r = String(role || "")
    .toLowerCase()
    .trim();
  return r === "admin" || r === "planner";
}

function StatusPill({ status, clickable, onClick }) {
  const st = String(status || "").toUpperCase();

  if (st === "READY" || st === "대기중") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        className={[
          "inline-flex items-center gap-1.5 min-w-[92px] justify-center",
          "text-[11px] px-2 py-0.5 rounded-full border",
          clickable
            ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
            : "bg-white text-slate-400 border-slate-200 cursor-not-allowed opacity-60",
        ].join(" ")}
        title={clickable ? "클릭해서 실행" : "권한 없음"}
      >
        READY <Play className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (st === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-[84px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
        PENDING <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (st === "OPTIMAL") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-[84px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
        OPTIMAL <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (!st || st === "-") {
    return (
      <span className="inline-flex items-center min-w-[84px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
        -
      </span>
    );
  }

  return (
    <span className="inline-flex items-center min-w-[84px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
      {st}
    </span>
  );
}

function StatCard({ label, value, sub, right }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">
              {label}
            </div>
            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {value}
            </div>
            {sub ? (
              <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>
            ) : null}
          </div>
          {right ? <div className="pt-0.5">{right}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function SimulationPage() {
  const router = useRouter();
  const token = useToken((s) => s.token);
  const account = useAccount((s) => s.account);
  const canEdit = roleOk(account?.role);

  // ✅ 두 패널 높이(동일)
  const PANEL_H = "h-[calc(100vh-360px)]";

  // products 목록
  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodErr, setProdErr] = useState("");

  // 검색/페이지네이션
  const [q, setQ] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(9);

  // 목록
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 선택은 id로
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // ✅ 오른쪽 상세 패널용 “활성 행”
  const [activeId, setActiveId] = useState("");

  // 생성 Drawer
  const [openNew, setOpenNew] = useState(false);

  const [newForm, setNewForm] = useState({
    title: "",
    description: "",
    productIds: [],
    productNames: [],
    requiredStaff: "",
    startDate: fmtDate(new Date().toISOString()),
    startTime: "09:00",
  });

  async function refreshWithRetry() {
    await refresh();
    await new Promise((r) => setTimeout(r, 800));
    await refresh();
  }

  function buildStartDateTime(dateStr, timeStr) {
    const d = (dateStr || "").trim();
    const t = (timeStr || "00:00").trim();
    if (!d) return "";
    return `${d}T${t}:00`;
  }

  async function enrichRowsWithMeta(baseRows) {
    const enriched = await Promise.all(
      (baseRows || []).map(async (row) => {
        try {
          const meta = await getSimulationMetaJson(row.id, token);

          const pList =
            meta?.simulation?.productList ||
            meta?.simulation?.productIds ||
            null;

          const spl = meta?.simulation?.simulationProductList || [];

          const metaCount = Array.isArray(pList)
            ? pList.length
            : Array.isArray(spl)
              ? spl.length
              : 0;

          const firstIdFromSPL = spl?.[0]?.product?.id || "";
          const firstNameFromSPL = spl?.[0]?.product?.name || "";

          return {
            ...row,
            productId: row.productId || firstIdFromSPL,
            productName: row.productName || firstNameFromSPL,
            productCount:
              row.productCount == null ||
              row.productCount === "" ||
              Number(row.productCount) === 0
                ? metaCount
                : Number(row.productCount),
          };
        } catch (e) {
          console.warn("[SIM][META] failed row:", row.id, e);
          return row;
        }
      }),
    );

    return enriched;
  }

  async function refresh() {
    if (!token) return;
    setLoading(true);

    try {
      const json = await getSimulations(token);
      const list = json?.simulationScheduleList || [];

      const baseRows = (list || []).map((r) => ({
        id: r.id,
        memberName: r.memberName || "-",
        title: r.title || "-",
        description: r.description || "",
        productId: r.productId || "",
        productName: r.productName || "",
        productCount: r.productCount,
        requiredStaff: r.requiredStaff,
        status: r.status || "-",
        simulationStartDate: r.simulationStartDate || "",
        workTime: r.workTime ?? 0,
      }));

      const enriched = await enrichRowsWithMeta(baseRows);

      setData(enriched);
      setSelectedIds(new Set());
      setPageIndex(0);

      setActiveId((prev) => {
        if (prev && enriched.some((x) => x.id === prev)) return prev;
        return enriched?.[0]?.id || "";
      });
    } catch (e) {
      console.error("[SIM][LIST] refresh failed:", e);
      window.alert(e?.message || "조회 실패");
      setData([]);
      setSelectedIds(new Set());
      setPageIndex(0);
      setActiveId("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 제품 목록 불러오기
  useEffect(() => {
    if (!token) return;

    let alive = true;
    setProdLoading(true);
    setProdErr("");

    (async () => {
      try {
        const json = await getProducts(token);
        const list = json?.productList || [];
        const normalized = (list || []).map((p) => ({
          id: p.id,
          name: p.name,
        }));
        if (!alive) return;
        setProducts(normalized.filter((x) => x.id));
      } catch (e) {
        if (!alive) return;
        setProdErr(e?.message || "제품 목록 조회 실패");
        setProducts([]);
      } finally {
        if (!alive) return;
        setProdLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  // 검색
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return data;

    return data.filter((r) => {
      return (
        String(r.title || "")
          .toLowerCase()
          .includes(kw) ||
        String(r.description || "")
          .toLowerCase()
          .includes(kw) ||
        String(r.memberName || "")
          .toLowerCase()
          .includes(kw) ||
        String(r.status || "")
          .toLowerCase()
          .includes(kw) ||
        String(r.productId || "")
          .toLowerCase()
          .includes(kw) ||
        String(r.productName || "")
          .toLowerCase()
          .includes(kw)
      );
    });
  }, [data, q]);

  const totalRows = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageIndex, pageSize]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageIndex]);

  const isAllPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const isSomePageSelected =
    pageRows.some((r) => selectedIds.has(r.id)) && !isAllPageSelected;

  const toggleAllPage = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      });
      return next;
    });
  };

  const toggleOne = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  async function onCreate() {
    if (!canEdit) return;

    if (!newForm.title.trim()) {
      window.alert("시뮬레이션 제목을 입력해 주세요.");
      return;
    }

    const selected = (newForm.productIds || []).map(String);
    if (selected.length === 0) {
      window.alert("시뮬레이션에 사용할 생산대상을 선택해 주세요.");
      return;
    }

    const startDateTime = buildStartDateTime(
      newForm.startDate,
      newForm.startTime,
    );

    const requiredStaffNum =
      newForm.requiredStaff === "" ? 0 : Number(newForm.requiredStaff || 0);

    const payload = {
      title: newForm.title.trim(),
      description: newForm.description || "",
      productList: selected,
      requiredStaff: Number.isNaN(requiredStaffNum) ? 0 : requiredStaffNum,
      simulationStartDate: newForm.startDate,
      workTime: 0,
      startDateTime,
    };

    try {
      await createSimulation(payload, token);

      setOpenNew(false);
      setNewForm({
        title: "",
        description: "",
        productIds: [],
        productNames: [],
        requiredStaff: "",
        startDate: fmtDate(new Date().toISOString()),
        startTime: "09:00",
      });

      await refreshWithRetry();
    } catch (e) {
      console.error("[SIM][CREATE] failed:", e);
      window.alert(e?.message || "생성 실패");
    }
  }

  async function onRun(simId) {
    if (!canEdit) return;
    if (!confirm("해당 시뮬레이션을 실행하시겠습니까?")) return;

    setData((prev) =>
      prev.map((r) => (r.id === simId ? { ...r, status: "PENDING" } : r)),
    );

    try {
      await runSimulation(simId, token);
      await refreshWithRetry();
    } catch (e) {
      console.error("[SIM][RUN] failed:", e);
      await refreshWithRetry();
      window.alert(e?.message || "실행 실패");
    }
  }

  async function deleteSelectedHandle() {
    if (!canEdit) return;
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    if (!confirm(`선택한 ${ids.length}건을 삭제하시겠습니까?`)) return;

    const results = await Promise.allSettled(
      ids.map(async (id) => deleteSimulation(id, token)),
    );

    const failed = results
      .map((r, i) => ({ r, id: ids[i] }))
      .filter((x) => x.r.status === "rejected");

    if (failed.length) {
      console.error("[SIM][DELETE] failed items:", failed);
      window.alert(`삭제 실패 ${failed.length}건 (콘솔 확인)`);
    } else {
      window.alert("삭제 완료");
    }

    await refreshWithRetry();
  }

  const activeRow = useMemo(() => {
    if (!activeId) return null;
    return (
      filtered.find((x) => x.id === activeId) ||
      data.find((x) => x.id === activeId) ||
      null
    );
  }, [activeId, filtered, data]);

  // KPI
  const readyCount = useMemo(
    () =>
      filtered.filter((x) => String(x.status || "").toUpperCase() === "READY")
        .length,
    [filtered],
  );
  const pendingCount = useMemo(
    () =>
      filtered.filter((x) => String(x.status || "").toUpperCase() === "PENDING")
        .length,
    [filtered],
  );
  const optimalCount = useMemo(
    () =>
      filtered.filter((x) => String(x.status || "").toUpperCase() === "OPTIMAL")
        .length,
    [filtered],
  );

  return (
    <DashboardShell crumbTop="시뮬레이션" crumbCurrent="Simulation">
      {/* 대시보드 헤더 */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Simulation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              생성 · 실행 · 결과(스케줄) 확인
            </p>
          </div>

          {/* 검색 */}
          <div className="relative w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPageIndex(0);
              }}
              placeholder="검색 (제목/설명/작성자/상태/제품)"
              className="
                h-10 w-full rounded-lg border border-slate-200 bg-white
                pl-9 pr-9 text-[12px]
                outline-none transition
                hover:border-slate-300
                focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                placeholder:text-[11px] placeholder:text-slate-400
              "
            />
            {q ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setPageIndex(0);
                }}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  text-slate-400 transition
                  hover:text-indigo-600 active:text-indigo-800
                "
                aria-label="clear"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {/*  KPI 카드 */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <StatCard
            label="Total"
            value={totalRows.toLocaleString()}
            sub="검색/필터 반영"
            right={
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-black">
                Σ
              </div>
            }
          />
          <StatCard
            label="Selected"
            value={selectedIds.size.toLocaleString()}
            sub="선택된 항목 수"
            right={
              <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-black">
                ✓
              </div>
            }
          />
          <StatCard
            label="Status"
            value={`${optimalCount}/${pendingCount}/${readyCount}`}
            sub="OPTIMAL / PENDING / READY"
            right={
              <div className="h-9 px-3 rounded-lg bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-700">
                O/P/R
              </div>
            }
          />
          <StatCard
            label="Active"
            value={activeRow?.id ? `#${activeRow.id}` : "-"}
            sub={
              activeRow?.title ? String(activeRow.title) : "선택된 항목 없음"
            }
            right={
              <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-black">
                i
              </div>
            }
          />
        </div>
      </div>

      {/* 2패널 본문 */}
      <div className="px-3 pb-5">
        <div className="flex gap-5 items-stretch">
          {/* LEFT */}
          <div className="flex-1 min-w-0">
            <div
              className={[
                "rounded-xl bg-white shadow-sm  ring-black/5 overflow-hidden",
                "flex flex-col",
                PANEL_H,
              ].join(" ")}
            >
              {/* 리스트 카드 헤더(툴바) */}
              <div className="shrink-0 px-4 py-2 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between gap-2">
                  {/* 좌측: 선택삭제 */}
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {selectedIds.size.toLocaleString()}
                      </span>
                      건 선택
                    </div>
                  </div>

                  {/* 우측: 생성 */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={deleteSelectedHandle}
                      disabled={!canEdit || selectedIds.size === 0}
                      className={[
                        "h-9 rounded-lg border px-4 text-sm font-semibold transition inline-flex items-center gap-2",
                        !canEdit || selectedIds.size === 0
                          ? "bg-white text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                          : "bg-white text-red-600 border-red-200 hover:bg-red-50 cursor-pointer",
                      ].join(" ")}
                      title={!canEdit ? "권한 없음" : ""}
                    >
                      <Trash2 className="h-4 w-4" />
                      선택 삭제
                    </button>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => setOpenNew(true)}
                        className="
                        h-9 rounded-lg border border-indigo-200 bg-indigo-600 px-5 text-sm font-semibold text-white
                        transition cursor-pointer
                        hover:bg-indigo-700 active:bg-indigo-800
                        focus:outline-none focus:ring-2 focus:ring-indigo-100
                        inline-flex items-center gap-2
                      "
                      >
                        <Plus className="h-4 w-4" />
                        생성
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* 테이블 */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-separate border-spacing-0 table-fixed">
                  <thead className="sticky top-0 z-10 bg-slate-200">
                    <tr className="text-left text-[12px] text-slate-600">
                      <th className="w-[44px] border-b border-slate-200 px-3 py-3">
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

                      <th className="w-[110px] border-b border-slate-200 px-3 py-3 font-semibold">
                        Id
                      </th>
                      <th className="w-[300px] border-b border-slate-200 px-3 py-3 font-semibold">
                        Title
                      </th>
                      <th className="w-[120px] border-b border-slate-200 px-3 py-3 font-semibold text-right">
                        Product
                      </th>
                      <th className="w-[110px] border-b border-slate-200 px-3 py-3 font-semibold">
                        Status
                      </th>
                      <th className="w-[120px] border-b border-slate-200 px-3 py-3 font-semibold">
                        Start
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-sm">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="border-b px-3 py-12 text-center"
                        >
                          <span className="text-slate-500">불러오는 중...</span>
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="border-b px-3 py-12 text-center"
                        >
                          <span className="text-slate-500">
                            데이터가 없습니다.
                          </span>
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((r) => {
                        const st = String(r.status || "").toUpperCase();
                        const isReady = st === "READY" || st === "대기중";
                        const isPending = st === "PENDING";

                        const isSelected = selectedIds.has(r.id);
                        const isActive = activeId === r.id;

                        const tdBase = "px-3 py-3 align-middle";
                        const tdNormal = `border-b border-slate-100 bg-white ${
                          !isActive && isSelected ? "bg-slate-50" : ""
                        }`;

                        const tdActiveMid =
                          "border-y-2 border-indigo-500 bg-indigo-50/40";

                        const tdActiveFirst =
                          "border-y-2 border-l-[3px] border-indigo-500 bg-indigo-50/40 rounded-l-md";

                        const tdActiveLast =
                          "border-y-2 border-r-[3px] border-indigo-500 bg-indigo-50/40 rounded-r-md";

                        const tdClass = (pos) => {
                          if (!isActive) return `${tdBase} ${tdNormal}`;
                          if (pos === "first")
                            return `${tdBase} ${tdActiveFirst}`;
                          if (pos === "last")
                            return `${tdBase} ${tdActiveLast}`;
                          return `${tdBase} ${tdActiveMid}`;
                        };

                        return (
                          <tr
                            key={r.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveId(r.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setActiveId(r.id);
                            }}
                            className={[
                              "cursor-pointer transition",
                              !isActive ? "hover:bg-slate-50" : "",
                            ].join(" ")}
                          >
                            <td className={tdClass("first")}>
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-indigo-600"
                                  checked={isSelected}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    toggleOne(r.id, e.target.checked)
                                  }
                                />
                              </div>
                            </td>

                            <td className={tdClass("mid")}>
                              <div className="font-mono text-xs text-slate-700 truncate">
                                {r.id}
                              </div>
                            </td>

                            <td className={tdClass("mid")}>
                              <div
                                className="font-semibold text-slate-900 truncate"
                                title={r.title || ""}
                              >
                                {r.title}
                              </div>
                              <div
                                className="text-[11px] text-slate-500 truncate"
                                title={r.description || ""}
                              >
                                {r.description || "-"}
                              </div>
                            </td>

                            <td
                              className={`${tdClass("mid")} text-right tabular-nums`}
                            >
                              {Number(r.productCount ?? 0)}
                            </td>

                            <td
                              className={tdClass("mid")}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <StatusPill
                                status={r.status}
                                clickable={canEdit && isReady && !isPending}
                                onClick={() => onRun(r.id)}
                              />
                            </td>

                            <td className={tdClass("last")}>
                              <span className="text-slate-700">
                                {fmtDate(r.simulationStartDate)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* footer pagination */}
              <div className="shrink-0 border-t border-slate-100 px-3 py-3 flex items-center justify-end gap-2 bg-white">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={pageIndex === 0}
                  className={[
                    "h-8 px-3 text-[12px] rounded-lg transition",
                    pageIndex === 0
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-700 hover:bg-slate-100 cursor-pointer",
                  ].join(" ")}
                >
                  이전
                </button>

                <div className="min-w-20 text-center text-[13px]">
                  <span className="font-semibold text-slate-800">
                    {pageIndex + 1}
                  </span>
                  <span className="text-slate-400"> / {pageCount}</span>
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={pageIndex >= pageCount - 1}
                  className={[
                    "h-8 px-3 text-[12px] rounded-lg transition",
                    pageIndex >= pageCount - 1
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-700 hover:bg-slate-100 cursor-pointer",
                  ].join(" ")}
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: 상세 */}
          <div className="w-[460px] shrink-0">
            <div
              className={[
                "rounded-xl bg-white shadow-lg overflow-hidden",
                "flex flex-col",
                "h-[calc(100vh-360px)]",
                activeRow ? "ring-2 ring-indigo-400" : "ring-1 ring-black/5",
              ].join(" ")}
            >
              <div className="shrink-0 px-4 py-4 border-b bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      상세 정보
                    </div>
                  </div>

                  <div className="text-[11px] font-black text-slate-400">
                    {activeRow?.id ? `#${activeRow.id}` : ""}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {!activeRow ? (
                  <div className="text-sm text-slate-500">
                    선택된 항목이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[11px] text-slate-500 font-semibold">
                        Title
                      </div>
                      <div className="text-sm text-slate-900 font-semibold break-words">
                        {activeRow.title || "-"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] text-slate-500 font-semibold">
                        Description
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                        {activeRow.description || "-"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] text-slate-500 font-semibold">
                          Member
                        </div>
                        <div className="text-sm text-slate-900 font-semibold truncate">
                          {activeRow.memberName || "-"}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] text-slate-500 font-semibold">
                          Status
                        </div>
                        <div className="pt-1">
                          <StatusPill
                            status={activeRow.status}
                            clickable={false}
                            onClick={() => {}}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] text-slate-500 font-semibold">
                          Product Count
                        </div>
                        <div className="text-sm text-slate-900 font-semibold tabular-nums">
                          {Number(activeRow.productCount ?? 0)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] text-slate-500 font-semibold">
                          Required Staff
                        </div>
                        <div className="text-sm text-slate-900 font-semibold tabular-nums">
                          {Number(activeRow.requiredStaff || 0)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] text-slate-500 font-semibold">
                          Start Date
                        </div>
                        <div className="text-sm text-slate-900 font-semibold tabular-nums">
                          {fmtDate(activeRow.simulationStartDate)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] text-slate-500 font-semibold">
                          Work Time
                        </div>
                        <div className="text-sm text-slate-900 font-semibold tabular-nums">
                          {Number(activeRow.workTime || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-100 p-3 flex gap-2 bg-white">
                <button
                  type="button"
                  onClick={() =>
                    activeRow &&
                    router.push(`/simulation/${activeRow.id}/gantt`)
                  }
                  disabled={!activeRow}
                  className={[
                    "h-9 flex-1 rounded-lg border px-4 text-sm font-black transition",
                    activeRow
                      ? "border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer"
                      : "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed",
                  ].join(" ")}
                >
                  결과 보기
                </button>

                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => activeRow && onRun(activeRow.id)}
                    disabled={
                      !activeRow ||
                      String(activeRow.status || "").toUpperCase() === "PENDING"
                    }
                    className={[
                      "h-9 rounded-lg border px-4 text-sm font-black transition",
                      !activeRow ||
                      String(activeRow.status || "").toUpperCase() === "PENDING"
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 cursor-pointer",
                    ].join(" ")}
                  >
                    실행
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SimulationCreateDrawer
        open={openNew}
        onOpenChange={setOpenNew}
        canEdit={canEdit}
        products={products}
        prodLoading={prodLoading}
        prodErr={prodErr}
        newForm={newForm}
        setNewForm={setNewForm}
        onCreate={onCreate}
      />
    </DashboardShell>
  );
}
