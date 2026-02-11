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

import { getProducts } from "@/api/product-api";
import SimulationCreateDrawer from "@/components/simulation/simulation-create-drawer";

import { Spinner } from "@/components/ui/spinner";
import {
  Play,
  Check,
  Plus,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSearch,
} from "lucide-react";

/* ===============================
   util
=============================== */
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

function buildStartDateTime(dateStr, timeStr) {
  const d = (dateStr || "").trim();
  const t = (timeStr || "00:00").trim();
  if (!d) return "";
  return `${d}T${t}:00`;
}

/* ===============================
   UI pieces (폰트/굵기 낮춤)
=============================== */
function StatusPill({ status, clickable, onClick }) {
  const st = String(status || "").toUpperCase();

  if (st === "READY" || st === "대기중") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        className={[
          "inline-flex items-center gap-1.5 min-w-[86px] justify-center",
          "text-[10px] px-2 py-1 rounded-full border font-medium",
          "transition",
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
      <span className="inline-flex items-center gap-1.5 min-w-[86px] justify-center text-[10px] px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-medium">
        PENDING <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (st === "OPTIMAL") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-[86px] justify-center text-[10px] px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
        OPTIMAL <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (!st || st === "-") {
    return (
      <span className="inline-flex items-center min-w-[86px] justify-center text-[10px] px-2 py-1 rounded-full border bg-slate-100 text-slate-600 border-slate-200 font-medium">
        -
      </span>
    );
  }

  return (
    <span className="inline-flex items-center min-w-[86px] justify-center text-[10px] px-2 py-1 rounded-full border bg-slate-100 text-slate-600 border-slate-200 font-medium">
      {st}
    </span>
  );
}

function StatCard({ label, value, sub, tone = "slate", icon }) {
  const toneMap = {
    slate: "text-slate-900",
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  };

  return (
    <div className="relative rounded-2xl border bg-white p-4 shadow-sm ring-black/5">
      <div className="text-[10px] font-medium text-slate-500">{label}</div>

      {icon ? (
        <div className="absolute right-4 top-4 h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
          {icon}
        </div>
      ) : null}

      <div
        className={[
          "mt-1 text-[22px] font-semibold leading-tight",
          toneMap[tone] || toneMap.slate,
        ].join(" ")}
      >
        {value}
      </div>

      {sub ? (
        <div className="mt-0.5 text-[10px] leading-tight text-slate-500">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, mono, right, pill }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-medium text-slate-500">{label}</div>
        {right ? (
          <div className="text-[10px] text-slate-400">{right}</div>
        ) : null}
      </div>

      <div
        className={[
          "mt-1 text-[12px] font-medium text-slate-900 leading-snug",
          mono ? "font-mono" : "",
        ].join(" ")}
      >
        {pill ? pill : value == null || value === "" ? "-" : String(value)}
      </div>
    </div>
  );
}

export default function SimulationPage() {
  const router = useRouter();
  const token = useToken((s) => s.token);
  const account = useAccount((s) => s.account);
  const canEdit = roleOk(account?.role);

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

  // 오른쪽 상세 패널용 활성 행
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

  const selectedCount = selectedIds.size;

  const COLS = [
    { key: "check", w: "5%" },
    { key: "id", w: "15%" },
    { key: "title", w: "35%" },
    { key: "prod", w: "10%" },
    { key: "status", w: "15%" },
    { key: "start", w: "10%" },
  ];

  const ColGroup = () => (
    <colgroup>
      {COLS.map((c) => (
        <col key={c.key} style={{ width: c.w }} />
      ))}
    </colgroup>
  );

  return (
    <DashboardShell crumbTop="시뮬레이션" crumbCurrent="simulation">
      <div className="px-4 pt-4 min-h-[calc(100vh-120px)] flex flex-col gap-4">
        {/* ===== 상단 타이틀 + 검색 (폰트 낮춤) ===== */}
        <div className="shrink-0">
          <div className="flex justify-between items-end gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">
                시뮬레이션
              </h2>
              <p className="text-[11px] text-slate-500">
                생성 · 실행 · 결과(스케줄) 확인
              </p>
            </div>

            <div className="w-[445px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPageIndex(0);
                  }}
                  placeholder="검색 (제목/설명/생성자)"
                  className="
                    h-10 w-full rounded-xl border
                    pl-9 pr-9 text-[11px]
                    outline-none transition
                    hover:border-slate-300
                    focus:ring-2 focus:ring-indigo-200
                    placeholder:text-[10px]
                    placeholder:text-slate-400
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
            </div>
          </div>

          {/* ===== KPI + 작업 패널 (반응형 제거: 고정 12컬럼) ===== */}
          <div className="mt-5 grid grid-cols-12 gap-4">
            <div className="col-span-8 grid grid-cols-3 gap-4">
              <StatCard
                label="총 데이터"
                value={totalRows.toLocaleString()}
                sub="검색/필터 반영"
                tone="slate"
                icon={<FileSearch className="h-4 w-4" />}
              />
              <StatCard
                label="선택됨"
                value={selectedCount.toLocaleString()}
                sub="선택된 항목 수"
                tone="indigo"
                icon={<Check className="h-4 w-4" />}
              />
              <StatCard
                label="상태"
                value={`${optimalCount}/${pendingCount}/${readyCount}`}
                sub="OPTIMAL / PENDING / READY"
                tone="slate"
                icon={<span className="text-[10px] font-semibold">O/P/R</span>}
              />
            </div>

            <div className="col-span-4">
              <div className="rounded-2xl border bg-white p-4 shadow-sm ring-black/5 h-full flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-[10px] font-medium text-slate-500">
                    작업
                  </div>
                  <span className="items-center text-[10px] text-slate-400">
                    controls
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={deleteSelectedHandle}
                    disabled={!canEdit || selectedCount === 0}
                    className={[
                      "h-10 w-[110px] px-3",
                      "text-[11px] font-medium transition",
                      "inline-flex items-center justify-center gap-2 whitespace-nowrap",
                      !canEdit || selectedCount === 0
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-red-600 hover:bg-red-50 rounded-xl cursor-pointer",
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
                        h-10 flex-1 rounded-xl px-4
                        bg-indigo-900 text-white
                        text-[11px] font-medium
                        inline-flex items-center justify-center gap-2
                        transition hover:bg-indigo-800 active:bg-indigo-950
                        active:scale-[0.98] cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-indigo-300
                      "
                    >
                      <Plus className="h-4 w-4" />
                      생성
                    </button>
                  ) : (
                    <div className="flex-1 h-10 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-400 flex items-center justify-center">
                      권한: Admin/Planner
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* ✅ 반응형 제거: 항상 [1fr_auto] + 상세패널 고정폭 */}
          <div className="h-[485px] min-h-0 grid grid-cols-[1fr_auto] gap-4">
            {/* ===== 테이블 카드 ===== */}
            <div className="rounded-2xl border bg-white shadow-sm ring-black/5 overflow-hidden flex min-h-0 flex-col">
              <div className="shrink-0">
                <table className="w-full table-fixed border-collapse">
                  <ColGroup />
                  <thead>
                    <tr className="text-left text-[12px]">
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
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-medium text-white">
                        시뮬레이션 코드
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-medium text-white">
                        시뮬레이션 제목
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-medium text-white text-right">
                        생산 대상
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-medium text-white">
                        상태
                      </th>
                      <th className="border-b border-slate-200 bg-indigo-900 px-3 py-3 font-medium text-white">
                        시작 날짜
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
                <table className="w-full table-fixed border-collapse">
                  <ColGroup />
                  <tbody className="text-[12px]">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-[11px] text-slate-500"
                        >
                          불러오는 중...
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="px-4 py-16 text-center text-[11px] text-slate-600">
                            <div className="font-semibold text-indigo-700">
                              데이터가 없습니다.
                            </div>
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => setOpenNew(true)}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                                시뮬레이션 생성
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((r) => {
                        const st = String(r.status || "").toUpperCase();
                        const isReady = st === "READY" || st === "대기중";
                        const isPending = st === "PENDING";

                        const isSelected = selectedIds.has(r.id);
                        const isActive = activeId === r.id;

                        return (
                          <tr
                            key={r.id}
                            className={[
                              "transition-colors cursor-pointer",
                              isActive ? "bg-gray-200" : "hover:bg-gray-200",
                            ].join(" ")}
                            onClick={() => setActiveId(r.id)}
                          >
                            <td className="border-b border-slate-100 px-3 py-2">
                              <div
                                className="flex justify-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-indigo-700 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    toggleOne(r.id, e.target.checked)
                                  }
                                />
                              </div>
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2">
                              <div className="font-mono text-[11px] text-slate-700 truncate">
                                {r.id}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {r.memberName || "-"}
                              </div>
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2">
                              <div
                                className="font-medium text-slate-900 truncate"
                                title={r.title || ""}
                              >
                                {r.title}
                              </div>
                              <div
                                className="text-[10px] text-slate-500 truncate"
                                title={r.description || ""}
                              >
                                {r.description || "-"}
                              </div>
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums">
                              {Number(r.productCount ?? 0)}
                            </td>

                            <td
                              className="border-b border-slate-100 px-3 py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <StatusPill
                                status={r.status}
                                clickable={canEdit && isReady && !isPending}
                                onClick={() => onRun(r.id)}
                              />
                            </td>

                            <td className="border-b border-slate-100 px-3 py-2">
                              <span className="text-slate-700 tabular-nums text-[11px]">
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
            </div>

            {/* ===== 상세 패널 (고정폭) ===== */}
            <div className="w-[445px] shrink-0 min-h-0">
              <div className="rounded-2xl border bg-white shadow-sm ring-black/5 overflow-hidden flex min-h-0 flex-col h-full">
                <div className="shrink-0 px-4 py-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[13px] font-semibold text-slate-900">
                      상세 정보
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      {activeRow?.id ? `#${activeRow.id}` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
                  {!activeRow ? (
                    <div className="rounded-xl border bg-slate-50 p-6 text-[11px] text-slate-500">
                      선택된 항목이 없습니다.
                    </div>
                  ) : (
                    <>
                      <Field label="제목" value={activeRow.title || "-"} />
                      <Field
                        label="설명"
                        value={activeRow.description || "-"}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Field
                          label="생성자"
                          value={activeRow.memberName || "-"}
                        />
                        <Field
                          label="상태"
                          value="-"
                          pill={
                            <StatusPill
                              status={activeRow.status}
                              clickable={false}
                              onClick={() => {}}
                            />
                          }
                        />
                        <Field
                          label="생산 대상 개수"
                          value={Number(activeRow.productCount ?? 0)}
                          right="ea"
                        />
                        <Field
                          label="인원"
                          value={Number(activeRow.requiredStaff || 0)}
                          right="people"
                        />
                        <Field
                          label="시작 날짜"
                          value={fmtDate(activeRow.simulationStartDate)}
                          mono
                        />
                        <Field
                          label="작업 시간(분)"
                          value={Number(activeRow.workTime || 0)}
                          right="min"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="shrink-0 border-t bg-white p-3 flex gap-2 sticky bottom-0">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => activeRow && onRun(activeRow.id)}
                      disabled={
                        !activeRow ||
                        String(activeRow.status || "").toUpperCase() ===
                          "PENDING"
                      }
                      className={[
                        "h-10 w-[120px] rounded-xl px-4 text-[11px] font-medium transition",
                        !activeRow ||
                        String(activeRow.status || "").toUpperCase() ===
                          "PENDING"
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-indigo-900 text-white hover:bg-indigo-800 active:bg-indigo-950",
                      ].join(" ")}
                    >
                      실행
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      activeRow &&
                      router.push(`/simulation/${activeRow.id}/gantt`)
                    }
                    disabled={!activeRow}
                    className={[
                      "h-10 flex-1 rounded-xl px-4 text-[11px] font-medium transition",
                      activeRow
                        ? "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed",
                    ].join(" ")}
                  >
                    결과 보기
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 페이지네이션 */}
          <div className="shrink-0 flex items-center justify-end px-1 py-4">
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

            <div className="min-w-20 text-center text-[11px]">
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
