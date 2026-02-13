// pages/simulation/index.js
import { useEffect, useMemo, useRef, useState } from "react";
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
  Layers,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  X,
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

function normStatus(v) {
  const s = String(v || "")
    .trim()
    .toUpperCase();
  if (s === "대기중") return "READY";
  return s;
}

/* ===============================
   list helpers (✅ 응답키 유연화)
=============================== */
function pickList(json) {
  return (
    json?.simulationScheduleList ||
    json?.simulationList ||
    json?.simulations ||
    json?.list ||
    json?.data?.simulationScheduleList ||
    json?.data?.simulationList ||
    json?.data?.simulations ||
    json?.data?.list ||
    (Array.isArray(json) ? json : [])
  );
}

function pickCreatedRow(created) {
  const item =
    created?.simulation ||
    created?.data?.simulation ||
    created?.result?.simulation ||
    created?.notice || // 혹시 다른 래핑 대비(안쓰여도 무해)
    null;

  if (!item) return null;

  return {
    id: item.id ?? item.simulationId ?? item.simulation_id ?? "",
    memberName: item.memberName || item.member?.name || "-",
    title: item.title || "-",
    description: item.description || "",
    productId: "",
    productName: "",
    productCount: Array.isArray(item.productList) ? item.productList.length : 0,
    requiredStaff: item.requiredStaff ?? 0,
    status: item.status || "READY",
    simulationStartDate: item.simulationStartDate || "",
    workTime: item.workTime ?? 0,

    // ✅ 최신 정렬용(서버가 createdAt을 주면 그걸 써도 되고, 없으면 지금 시간)
    _sortTs: Date.now(),
  };
}

/* ===============================
   최신순 정렬 유틸 (✅ 핵심)
   - 1순위: createdAt 있으면 createdAt
   - 2순위: simulationStartDate
   - 3순위: id(문자열) 내림차순
=============================== */
function toMs(v) {
  if (v == null || v === "") return NaN;
  const s = String(v).trim();
  if (!s) return NaN;
  const d = new Date(s);
  const t = d.getTime();
  return Number.isFinite(t) ? t : NaN;
}

function getRowSortTs(r) {
  // createdAt 형태가 있으면 우선
  const c =
    r?.createdAt ||
    r?.createAt ||
    r?.created_date ||
    r?.createdDate ||
    r?.created_time;

  const ct = toMs(c);
  if (Number.isFinite(ct)) return ct;

  // 없으면 startDate로
  const st = toMs(r?.simulationStartDate || r?.startDate || "");
  if (Number.isFinite(st)) return st;

  // 마지막 fallback
  const extra = Number(r?._sortTs);
  if (Number.isFinite(extra) && extra > 0) return extra;

  return 0;
}

function sortLatestFirst(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  arr.sort((a, b) => {
    const at = getRowSortTs(a);
    const bt = getRowSortTs(b);
    if (at !== bt) return bt - at;

    const aid = String(a?.id ?? "");
    const bid = String(b?.id ?? "");
    if (aid !== bid) return bid.localeCompare(aid);

    return 0;
  });
  return arr;
}

/* ===============================
   UI (Tasks 톤)
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
          "inline-flex items-center gap-1.5 min-w-[90px] justify-center",
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
      <span className="inline-flex items-center gap-1.5 min-w-[90px] justify-center text-[10px] px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-medium">
        PENDING <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (st === "OPTIMAL") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-[90px] justify-center text-[10px] px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
        OPTIMAL <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (!st || st === "-") {
    return (
      <span className="inline-flex items-center min-w-[90px] justify-center text-[10px] px-2 py-1 rounded-full border bg-slate-100 text-slate-600 border-slate-200 font-medium">
        -
      </span>
    );
  }

  return (
    <span className="inline-flex items-center min-w-[90px] justify-center text-[10px] px-2 py-1 rounded-full border bg-slate-100 text-slate-600 border-slate-200 font-medium">
      {st}
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

function Field({ label, value, mono, right, pill }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold text-slate-500">{label}</div>
        {right ? (
          <div className="text-[10px] text-slate-400">{right}</div>
        ) : null}
      </div>

      <div
        className={[
          "mt-1 text-[13px] text-slate-800 leading-5 break-words",
          mono ? "font-mono text-[12px]" : "font-medium",
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

  // ✅ refresh 중복 방지(연속 호출로 순서 꼬이는 것 방지)
  const refreshSeqRef = useRef(0);

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

            // ✅ meta에도 createdAt이 있을 수도 있으니 흡수(있으면 최신순 정렬 정확도↑)
            createdAt:
              row.createdAt ||
              meta?.simulation?.createdAt ||
              meta?.simulation?.createAt ||
              row.createdAt,
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

    const mySeq = ++refreshSeqRef.current;
    setLoading(true);

    try {
      const json = await getSimulations(token);
      console.log("[SIM][LIST] raw:", json);

      const list = pickList(json);

      const baseRows = (list || [])
        .map((r) => ({
          id: r.id ?? r.simulationId ?? r.simulation_id ?? "",
          memberName: r.memberName || r.member?.name || "-",
          title: r.title || "-",
          description: r.description || "",
          productId: r.productId || "",
          productName: r.productName || "",
          productCount: r.productCount,
          requiredStaff: r.requiredStaff,
          status: r.status || "-",
          simulationStartDate: r.simulationStartDate || r.startDate || "",
          workTime: r.workTime ?? 0,

          // ✅ 최신순 정렬 힌트(서버가 주면 사용)
          createdAt: r.createdAt || r.createAt || r.createdDate || "",
          _sortTs: Number(r._sortTs) || 0,
        }))
        .filter((x) => x.id);

      const enriched = await enrichRowsWithMeta(baseRows);

      // ✅ 최신순 정렬 적용
      const sorted = sortLatestFirst(enriched);

      // ✅ 오래된 refresh 결과가 나중에 도착하면 무시(레이스 방지)
      if (mySeq !== refreshSeqRef.current) return;

      setData(sorted);
      setSelectedIds(new Set());
      setPageIndex(0);

      setActiveId((prev) => {
        if (prev && sorted.some((x) => x.id === prev)) return prev;
        return sorted?.[0]?.id || "";
      });
    } catch (e) {
      console.error("[SIM][LIST] refresh failed:", e);
      window.alert(e?.message || "조회 실패");
      setData([]);
      setSelectedIds(new Set());
      setPageIndex(0);
      setActiveId("");
    } finally {
      if (mySeq === refreshSeqRef.current) setLoading(false);
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

  // ✅ 검색 (data 자체가 이미 최신순이므로, filter 후에도 순서 유지됨)
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
      const created = await createSimulation(payload, token);
      console.log("[SIM][CREATE] raw:", created);

      // ✅ 생성 응답을 즉시 표에 "맨 위"로 반영 + 최신순 유지
      const createdRow = pickCreatedRow(created);

      if (createdRow?.id) {
        setData((prev) => {
          const next = [
            createdRow,
            ...(prev || []).filter((x) => x.id !== createdRow.id),
          ];
          return sortLatestFirst(next);
        });

        setActiveId(createdRow.id);
        setSelectedIds(new Set());
        setPageIndex(0);
      }

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
      sortLatestFirst(
        (prev || []).map((r) =>
          r.id === simId ? { ...r, status: "PENDING" } : r,
        ),
      ),
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
    () => filtered.filter((x) => normStatus(x.status) === "READY").length,
    [filtered],
  );

  const pendingCount = useMemo(
    () => filtered.filter((x) => normStatus(x.status) === "PENDING").length,
    [filtered],
  );

  const optimalCount = useMemo(
    () => filtered.filter((x) => normStatus(x.status) === "OPTIMAL").length,
    [filtered],
  );

  const selectedCount = selectedIds.size;

  const COLS = [
    { key: "check", w: "44px" },
    { key: "id", w: "18%" },
    { key: "title", w: "40%" },
    { key: "prod", w: "110px" },
    { key: "status", w: "140px" },
    { key: "start", w: "140px" },
  ];

  const ColGroup = () => (
    <colgroup>
      {COLS.map((c) => (
        <col key={c.key} style={{ width: c.w }} />
      ))}
    </colgroup>
  );

  const clearAllSearch = () => {
    setQ("");
    setPageIndex(0);
  };

  return (
    <DashboardShell crumbTop="시뮬레이션" crumbCurrent="simulation">
      {/* Tasks 틀: 좌우 스크롤 대응 + 고정 높이 */}
      <div className="px-4 pt-4 w-full min-w-0 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[1280px] h-[calc(100vh-120px)] flex flex-col gap-4 pb-6">
          {/* ===== 상단 카드 (Tasks 톤) ===== */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4">
              {/* title row */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-sm shrink-0">
                      <span className="text-[14px] font-black">S</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[18px] font-black text-slate-900 truncate">
                          시뮬레이션
                        </div>

                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          목록
                        </span>
                      </div>
                      <div className="text-[12px] text-slate-500 truncate">
                        생성 · 실행 · 결과(스케줄) 확인
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
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setPageIndex(0);
                      }}
                      placeholder="검색 (제목/설명/생성자/상태/제품)"
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
                    {q ? (
                      <button
                        type="button"
                        onClick={clearAllSearch}
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
                    onClick={deleteSelectedHandle}
                    disabled={!canEdit || selectedCount === 0}
                    className={[
                      "h-10 px-4 rounded-full",
                      "border bg-white",
                      "text-[13px] font-semibold transition",
                      "inline-flex items-center gap-2",
                      !canEdit || selectedCount === 0
                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                        : "border-rose-200 text-rose-600 hover:bg-rose-50",
                    ].join(" ")}
                    title={!canEdit ? "권한 없음" : "선택 삭제"}
                  >
                    <Trash2 size={16} />
                    선택 삭제
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpenNew(true)}
                    disabled={!canEdit}
                    className={[
                      "h-10 px-6 rounded-full",
                      "inline-flex items-center gap-2 justify-center",
                      "text-[13px] font-semibold transition",
                      canEdit
                        ? "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 active:scale-[0.98] shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        : "bg-indigo-50 text-indigo-300 cursor-not-allowed border border-indigo-100",
                    ].join(" ")}
                    title={canEdit ? "시뮬레이션 생성" : "권한: Admin/Planner"}
                  >
                    <Plus size={16} className="shrink-0" />
                    생성
                  </button>
                </div>
              </div>

              {/* stat cards + work panel */}
              <div className="mt-4 grid grid-cols-12 gap-3">
                <div className="col-span-8 grid grid-cols-3 gap-3">
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
                    sub="체크된 항목"
                    tone="indigo"
                    icon={<CheckCircle className="h-4 w-4" />}
                  />

                  <StatCard
                    title="STATUS"
                    value={`${optimalCount}/${pendingCount}/${readyCount}`}
                    sub="OPTIMAL / PENDING / READY"
                    tone="amber"
                    icon={<AlertCircle className="h-4 w-4" />}
                    valueClass="pt-1.5 pb-1.5 text-[18px] font-bold text-slate-800"
                  />
                </div>

                <div className="col-span-4">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-3 h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] font-semibold text-slate-500">
                        안내
                      </div>
                      <span className="text-[10px] text-slate-400">tips</span>
                    </div>

                    <div className="mt-3 text-[12px] text-slate-600 leading-5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        OPTIMAL: 결과 스케줄 생성 완료
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        PENDING: 실행 중
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                        READY: 실행 가능(권한 필요)
                      </div>

                      {!canEdit ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                          권한이 없어서 생성/삭제/실행이 비활성화됩니다.
                          (Admin/Planner)
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* products load error (optional) */}
              {prodErr ? (
                <div className="mt-3 text-[12px] text-rose-600">{prodErr}</div>
              ) : null}
              {prodLoading ? (
                <div className="mt-1 text-[12px] text-slate-400">
                  제품 목록 불러오는 중...
                </div>
              ) : null}
            </div>
          </div>

          {/* ===== 테이블 + 상세패널 ===== */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 grid grid-cols-[1fr_auto] gap-4 items-stretch">
              {/* Table card */}
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex min-h-0 flex-col">
                {/* head */}
                <div className="shrink-0">
                  <table className="w-full table-fixed border-collapse">
                    <ColGroup />
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
                          시뮬레이션 코드
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          시뮬레이션 제목
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3 text-right">
                          생산 대상
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          상태
                        </th>
                        <th className="border-b border-slate-200 px-3 py-3">
                          시작 날짜
                        </th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* body */}
                <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
                  <table className="w-full table-fixed border-collapse">
                    <ColGroup />
                    <tbody className="text-[13px]">
                      {loading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-12 text-center text-[12px] text-slate-500"
                          >
                            불러오는 중...
                          </td>
                        </tr>
                      ) : pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div className="px-4 py-16 text-center text-[12px] text-slate-600">
                              <div className="font-semibold text-indigo-700">
                                데이터가 없습니다.
                              </div>
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => setOpenNew(true)}
                                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-100"
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
                                "group transition-colors cursor-pointer",
                                isActive
                                  ? "bg-indigo-50/60"
                                  : "hover:bg-indigo-50/40",
                              ].join(" ")}
                              onClick={() => setActiveId(r.id)}
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
                                    checked={isSelected}
                                    onChange={(e) =>
                                      toggleOne(r.id, e.target.checked)
                                    }
                                  />
                                </div>
                              </td>

                              {/* id */}
                              <td className="border-b border-slate-100 px-3 py-2">
                                <div className="font-mono text-[12px] text-slate-800 truncate">
                                  {r.id}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {r.memberName || "-"}
                                </div>
                              </td>

                              {/* title */}
                              <td className="border-b border-slate-100 px-3 py-2">
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

                              {/* product count */}
                              <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-700">
                                {Number(r.productCount ?? 0)}
                              </td>

                              {/* status */}
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

                              {/* start date */}
                              <td className="border-b border-slate-100 px-3 py-2">
                                <span className="text-slate-700 tabular-nums text-[12px]">
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

                {/* table footer (Tasks 톤) */}
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

              {/* ===== 상세 패널 (Tasks 톤) ===== */}
              <div className="w-[445px] shrink-0 min-h-0 flex">
                <div className="w-full h-full min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
                  {/* header */}
                  <div className="shrink-0 px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">
                          상세 정보
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {activeRow?.id
                            ? `#${activeRow.id}`
                            : "선택된 항목 없음"}
                        </div>
                      </div>

                      {activeRow ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveId("");
                            setSelectedIds(new Set());
                          }}
                          className="
                            h-8 w-8 rounded-xl grid place-items-center
                            text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                            transition
                          "
                          aria-label="clear active"
                          title="선택 해제"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* body */}
                  <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll p-3 space-y-2">
                    {!activeRow ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-[12px] font-semibold text-slate-700">
                          선택된 항목이 없습니다.
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          왼쪽 표에서 시뮬레이션을 클릭하면 상세가 표시됩니다.
                        </div>
                      </div>
                    ) : (
                      <>
                        <Field label="제목" value={activeRow.title || "-"} />
                        <Field
                          label="설명"
                          value={activeRow.description || "-"}
                        />

                        <div className="grid grid-cols-2 gap-2">
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
                            mono
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* footer buttons */}
                  <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 flex gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => activeRow && onRun(activeRow.id)}
                        disabled={
                          !activeRow ||
                          String(activeRow.status || "").toUpperCase() ===
                            "PENDING"
                        }
                        className={[
                          "h-10 px-5 rounded-full text-[13px] font-semibold transition",
                          !activeRow ||
                          String(activeRow.status || "").toUpperCase() ===
                            "PENDING"
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 active:scale-[0.98] shadow-sm",
                        ].join(" ")}
                      >
                        실행
                      </button>
                    ) : (
                      <div className="h-10 px-5 rounded-full border border-slate-200 bg-slate-50 text-[12px] text-slate-400 flex items-center">
                        권한: Admin/Planner
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        activeRow &&
                        router.push(`/simulation/${activeRow.id}/gantt`)
                      }
                      disabled={!activeRow}
                      className={[
                        "h-10 flex-1 rounded-full px-5 text-[13px] font-semibold transition",
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
        </div>
      </div>
    </DashboardShell>
  );
}
