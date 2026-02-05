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

import { Spinner } from "@/components/ui/spinner";
import { Play, Check, Plus, Search, X } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
          "inline-flex items-center gap-1.5 min-w-[88px] justify-center",
          "text-[11px] px-2 py-0.5 rounded-full border",
          clickable
            ? "bg-white text-gray-700 border-gray-200 hover:bg-gray-100 cursor-pointer"
            : "bg-white text-gray-400 border-gray-200 cursor-not-allowed opacity-60",
        ].join(" ")}
        title={clickable ? "클릭해서 실행" : "권한 없음"}
      >
        READY
        <Play className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (st === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-[72px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
        PENDING
        <Spinner className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (st === "OPTIMAL") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-[72px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
        OPTIMAL
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (!st || st === "-") {
    return (
      <span className="inline-flex items-center min-w-[72px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-gray-100 text-gray-700 border-gray-200">
        -
      </span>
    );
  }

  return (
    <span className="inline-flex items-center min-w-[72px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-gray-100 text-gray-700 border-gray-200">
      {st}
    </span>
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

  // 생성 Drawer
  const [openNew, setOpenNew] = useState(false);

  const TITLE_MAX = 60;
  const DESC_MAX = 255;

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

  // meta에서 productList 길이를 productCount로 반영
  async function enrichRowsWithMeta(baseRows) {
    const enriched = await Promise.all(
      (baseRows || []).map(async (row) => {
        try {
          const meta = await getSimulationMetaJson(row.id, token);

          // ✅ 백 상세 응답 구조가
          // { simulation: { productList: ["APL..", ...] } }
          // 또는 { simulation: { simulationProductList: [{product:{id}}...] } }
          // 둘 다 커버
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

            // ✅ 화면에서 쓰는 productCount는
            // (1) 목록 응답에 있으면 그거 우선
            // (2) 없거나 0이면 metaCount로 채움
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
        productCount: r.productCount, // 백이 줄 수도 있고 아닐 수도
        requiredStaff: r.requiredStaff,
        status: r.status || "-",
        simulationStartDate: r.simulationStartDate || "",
        workTime: r.workTime ?? 0,
      }));

      const enriched = await enrichRowsWithMeta(baseRows);

      setData(enriched);
      setSelectedIds(new Set());
      setPageIndex(0);
    } catch (e) {
      console.error("[SIM][LIST] refresh failed:", e);
      window.alert(e?.message || "조회 실패");
      setData([]);
      setSelectedIds(new Set());
      setPageIndex(0);
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

  // 페이지 전체선택
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

  // 폼 valid
  const isFormValid = useMemo(() => {
    const titleOk = newForm.title.trim().length > 0;
    const productOk = (newForm.productIds || []).length > 0;

    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(String(newForm.startDate || ""));
    const timeOk = /^\d{2}:\d{2}$/.test(String(newForm.startTime || ""));

    const staffOk =
      newForm.requiredStaff === "" ||
      (!Number.isNaN(Number(newForm.requiredStaff)) &&
        Number(newForm.requiredStaff) >= 0);

    return titleOk && productOk && dateOk && timeOk && staffOk;
  }, [newForm]);

  // 제품 토글
  const toggleProduct = (p, checked) => {
    const pid = String(p.id);
    const pname = String(p.name || "");

    setNewForm((s) => {
      const ids = new Set((s.productIds || []).map(String));
      const namesById = new Map(
        (s.productIds || []).map((id, idx) => [
          String(id),
          String(s.productNames?.[idx] || ""),
        ]),
      );

      if (checked) {
        ids.add(pid);
        namesById.set(pid, pname);
      } else {
        ids.delete(pid);
        namesById.delete(pid);
      }

      const nextIds = Array.from(ids);
      const nextNames = nextIds.map((id) => namesById.get(id) || "");

      return { ...s, productIds: nextIds, productNames: nextNames };
    });
  };

  const clearAllProducts = () => {
    setNewForm((s) => ({ ...s, productIds: [], productNames: [] }));
  };

  const removeOneSelected = (pid) => {
    setNewForm((s) => {
      const nextIds = (s.productIds || []).filter(
        (x) => String(x) !== String(pid),
      );
      const nextNames = nextIds.map((id) => {
        const idx = (s.productIds || []).findIndex(
          (x) => String(x) === String(id),
        );
        return String(s.productNames?.[idx] || "");
      });
      return { ...s, productIds: nextIds, productNames: nextNames };
    });
  };

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

    // ✅ requiredStaff null 금지
    const requiredStaffNum =
      newForm.requiredStaff === "" ? 0 : Number(newForm.requiredStaff || 0);

    // ✅ 백이 받는 진짜 키: productList
    const payload = {
      title: newForm.title.trim(),
      description: newForm.description || "",
      productList: selected, // ✅ 핵심
      requiredStaff: Number.isNaN(requiredStaffNum) ? 0 : requiredStaffNum,
      simulationStartDate: newForm.startDate,
      workTime: 0,
      startDateTime, // 백이 안 받으면 무시될 뿐이라 OK
    };

    console.log("[SIM][CREATE] productList:", payload.productList);
    console.log("[SIM][CREATE] productCount:", payload.productList.length);
    console.log("[SIM][CREATE] payload:", payload);

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
    console.log("[SIM][DELETE] selected ids:", ids);

    if (!confirm(`선택한 ${ids.length}건을 삭제하시겠습니까?`)) return;

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        console.log("[SIM][DELETE] try id:", id);
        const res = await deleteSimulation(id, token);
        console.log("[SIM][DELETE] success id:", id, "res:", res);
        return res;
      }),
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

  return (
    <DashboardShell crumbTop="시뮬레이션" crumbCurrent="Simulation">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4 px-3 py-3">
        <div className="flex justify-between gap-4 items-center">
          <h2 className="text-2xl font-bold tracking-tight">Simulation</h2>
          <p className="mt-1 text-xs text-gray-500">
            생성 / 실행 / 결과(스케줄) 확인
          </p>
        </div>
      </div>

      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-3 px-4">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
          <span>총 {totalRows.toLocaleString()}건</span>
          <span className="mx-1 h-4 w-px bg-gray-200" />
          <span>선택 {selectedIds.size.toLocaleString()}건</span>
          <span className="mx-1 h-4 w-px bg-gray-200" />

          <button
            type="button"
            onClick={deleteSelectedHandle}
            disabled={!canEdit || selectedIds.size === 0}
            className={[
              "h-8 rounded-md border px-3 text-sm transition",
              !canEdit || selectedIds.size === 0
                ? "bg-white text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                : "bg-white text-red-500 border-red-200 hover:bg-red-50 cursor-pointer",
            ].join(" ")}
            title={!canEdit ? "권한 없음" : ""}
          >
            선택 삭제
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPageIndex(0);
              }}
              placeholder="검색 (제목/작성자/상태)"
              className="h-8 w-full rounded-md border bg-white pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-black/10"
            />
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setOpenNew(true)}
              className="h-8 rounded-md border transition border-blue-200 text-blue-600 bg-white px-4 text-sm hover:bg-blue-50 cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              생성
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* 표 박스 */}
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full border-separate border-spacing-0">
            <thead className="bg-slate-200">
              <tr className="text-left text-sm">
                <th className="w-[44px] border-b px-3 py-3">
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

                <th className="min-w-[120px] border-b px-3 py-3 font-medium">
                  Id
                </th>
                <th className="min-w-[320px] border-b px-3 py-3 font-medium">
                  Title
                </th>
                <th className="min-w-[140px] border-b px-3 py-3 font-medium">
                  Member
                </th>
                <th className="min-w-[120px] border-b px-3 py-3 font-medium text-right">
                  Product Count
                </th>

                <th className="min-w-[90px] border-b px-3 py-3 font-medium text-right">
                  Staff
                </th>
                <th className="min-w-[120px] border-b px-3 py-3 font-medium">
                  Status
                </th>
                <th className="min-w-[120px] border-b px-3 py-3 font-medium">
                  Start Date
                </th>
                <th className="min-w-[90px] border-b px-3 py-3 pr-5 font-medium text-right">
                  Work Time
                </th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={10} className="border-b px-3 py-10 text-center">
                    <span className="text-gray-500">불러오는 중...</span>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="border-b px-3 py-10 text-center">
                    <span className="text-gray-500">데이터가 없습니다.</span>
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const st = String(r.status || "").toUpperCase();
                  const isReady = st === "READY" || st === "대기중";
                  const isPending = st === "PENDING";

                  const goDetail = () => {
                    router.push(`/simulation/${r.id}/gantt`);
                  };

                  return (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={goDetail}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") goDetail();
                      }}
                      className={[
                        "cursor-pointer hover:bg-slate-200/80",
                        selectedIds.has(r.id) ? "bg-slate-100" : "",
                      ].join(" ")}
                    >
                      <td
                        className="border-b px-3 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-black"
                            checked={selectedIds.has(r.id)}
                            onChange={(e) => toggleOne(r.id, e.target.checked)}
                          />
                        </div>
                      </td>

                      <td className="border-b px-3 py-3 font-mono text-xs text-gray-700">
                        {r.id}
                      </td>

                      <td className="border-b px-3 py-3">
                        <div className="font-medium">{r.title}</div>
                        {r.description ? (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {r.description}
                          </div>
                        ) : null}
                      </td>

                      <td className="border-b px-3 py-3">{r.memberName}</td>

                      <td className="border-b px-3 py-3 text-right tabular-nums">
                        {Number(r.productCount ?? 0)}
                      </td>

                      <td className="border-b px-3 py-3 text-right tabular-nums">
                        {Number(r.requiredStaff || 0)}
                      </td>

                      <td
                        className="border-b px-3 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <StatusPill
                          status={r.status}
                          clickable={canEdit && isReady && !isPending}
                          onClick={() => onRun(r.id)}
                        />
                      </td>

                      <td className="border-b px-3 py-3">
                        {fmtDate(r.simulationStartDate)}
                      </td>

                      <td className="border-b px-3 py-3 text-right tabular-nums">
                        {Number(r.workTime || 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-2 flex items-center justify-end gap-2 px-1">
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

      {/* Drawer */}
      <Drawer open={openNew} onOpenChange={setOpenNew} direction="right">
        <DrawerContent className="fixed right-0 top-0 h-dvh w-[420px] sm:w-[520px] rounded-none border-l bg-white p-0">
          <div className="flex h-dvh flex-col">
            <DrawerHeader>
              <DrawerTitle>시뮬레이션 생성</DrawerTitle>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Title */}
              <div>
                <div className="flex items-end justify-between mb-1">
                  <div className="text-xs text-gray-500">Title</div>
                  <div className="text-[11px] text-gray-400">
                    {(newForm.title || "").length}/{TITLE_MAX}
                  </div>
                </div>

                <input
                  value={newForm.title}
                  maxLength={TITLE_MAX}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, title: e.target.value }))
                  }
                  className="h-10 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm placeholder:text-xs"
                  placeholder="Title"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-end justify-between mb-1">
                  <div className="text-xs text-gray-500">Description</div>
                  <div className="text-[11px] text-gray-400">
                    {(newForm.description || "").length}/{DESC_MAX}
                  </div>
                </div>

                <textarea
                  value={newForm.description}
                  maxLength={DESC_MAX}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, description: e.target.value }))
                  }
                  className="h-30 w-full rounded-md border px-2 py-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm placeholder:text-xs resize-none"
                  placeholder="Description"
                />
              </div>

              {/* Product list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-500">Product List</div>

                  {(newForm.productIds || []).length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllProducts}
                      className="text-[11px] text-gray-500 hover:text-gray-800"
                    >
                      선택해제
                    </button>
                  )}
                </div>

                <div className="rounded-md border bg-white">
                  <div className="max-h-[240px] overflow-y-auto p-2 space-y-2">
                    {prodLoading ? (
                      <div className="px-2 py-2 text-xs text-gray-500">
                        제품 목록 불러오는 중...
                      </div>
                    ) : products.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-gray-500">
                        등록된 제품이 없습니다
                      </div>
                    ) : (
                      products.map((p) => {
                        const pid = String(p.id);
                        const pname = String(p.name || "");
                        const checked = (newForm.productIds || []).some(
                          (x) => String(x) === pid,
                        );

                        return (
                          <label
                            key={pid}
                            className={[
                              "flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer",
                              "hover:bg-slate-100",
                              checked ? "bg-slate-100" : "",
                            ].join(" ")}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-black"
                              checked={checked}
                              onChange={(e) =>
                                toggleProduct(p, e.target.checked)
                              }
                            />

                            <div className="min-w-0 flex-1 text-[12px] leading-none">
                              <span className="font-mono text-gray-900">
                                {pid}
                              </span>
                              <span className="mx-2 text-gray-400">—</span>
                              <span className="text-gray-700 truncate inline-block align-bottom max-w-[320px]">
                                {pname || "-"}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {prodErr ? (
                  <div className="mt-2 text-xs text-red-600">{prodErr}</div>
                ) : null}
              </div>

              {/* Selected */}
              <div>
                <div className="text-xs text-gray-500 mb-2">
                  Selected Product
                  <span className="ml-2 text-[11px] text-gray-400">
                    {(newForm.productIds || []).length}개 선택됨
                  </span>
                </div>

                {(newForm.productIds || []).length === 0 ? (
                  <div className="h-10 w-full rounded-md border bg-gray-50 px-3 flex items-center text-sm text-gray-400">
                    -
                  </div>
                ) : (
                  <div className="rounded-md border bg-gray-50 p-2 flex flex-wrap gap-2">
                    {(newForm.productIds || []).map((id) => (
                      <div
                        key={String(id)}
                        className="inline-flex items-center gap-2 rounded-md border bg-white px-2 py-1"
                      >
                        <div className="text-[12px] font-mono text-gray-800">
                          {String(id)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeOneSelected(id)}
                          className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded hover:bg-gray-100"
                          title="삭제"
                        >
                          <X className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Staff */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Staff</div>
                <input
                  type="number"
                  value={newForm.requiredStaff}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, requiredStaff: e.target.value }))
                  }
                  className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm placeholder:text-xs"
                  min={0}
                  placeholder="Staff"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Start Date</div>
                  <input
                    type="date"
                    value={newForm.startDate || ""}
                    onChange={(e) =>
                      setNewForm((s) => ({ ...s, startDate: e.target.value }))
                    }
                    data-vaul-no-drag
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm"
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Start Time</div>
                  <input
                    type="time"
                    value={newForm.startTime || ""}
                    onChange={(e) =>
                      setNewForm((s) => ({ ...s, startTime: e.target.value }))
                    }
                    data-vaul-no-drag
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            <DrawerFooter>
              <button
                type="button"
                onClick={onCreate}
                disabled={!canEdit || !isFormValid}
                className={[
                  "h-9 rounded-md border px-4 text-sm transition",
                  !canEdit || !isFormValid
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-900 border-gray-200 hover:bg-gray-100 cursor-pointer",
                ].join(" ")}
                title={
                  !canEdit
                    ? "권한 없음"
                    : !isFormValid
                      ? "필수 항목을 입력해 주세요"
                      : ""
                }
              >
                생성
              </button>

              <DrawerClose asChild>
                <button
                  type="button"
                  className="h-9 rounded-md border border-gray-200 bg-white px-4 text-sm hover:bg-gray-100"
                >
                  취소
                </button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardShell>
  );
}
