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
} from "@/api/simulation-api";

import { Spinner } from "@/components/ui/spinner";
import { Play, Check, Plus, Search } from "lucide-react";

function fmtDate(v) {
  if (!v) return "-";
  const s = String(v);
  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];
  return s.slice(0, 10);
}

function roleOk(role) {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "planner";
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

function StatusPill({ status, clickable, onClick }) {
  const st = String(status || "").toUpperCase();

  if (st === "READY") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        className={[
          "inline-flex items-center gap-1.5 min-w-[72px] justify-center",
          "text-[11px] px-2 py-0.5 rounded-full border",
          clickable
            ? "bg-white text-gray-700 border-gray-200 hover:bg-gray-100 cursor-pointer"
            : "bg-white text-gray-400 border-gray-200 cursor-not-allowed opacity-60",
        ].join(" ")}
        title={clickable ? "클릭해서 실행 요청" : "권한 없음"}
      >
        대기중
        <Play className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (st === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-[72px] justify-center text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
        Pending
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

  // Product처럼 pageIndex/pageSize
  const [q, setQ] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(9);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 생성 모달
  const [openNew, setOpenNew] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "",
    description: "",
    requiredStaff: 1,
    simulationStartDate: fmtDate(new Date().toISOString()),
  });

  async function refresh() {
    if (!token) return;
    setLoading(true);
    setErr("");

    try {
      const json = await getSimulations(token);
      const list =
        json?.simulationScheduleList ||
        json?.simulationList ||
        json?.items ||
        json?.data ||
        [];

      const normalized = (list || []).map((r) => ({
        _rid: cryptoId(), // selection용
        id: r.id,
        memberName:
          r.memberName || r.member_name || r.member || r.writer || "-",
        title: r.title || "-",
        description: r.description || "",
        productCount: r.productCount ?? r.product_count ?? 0,
        requiredStaff: r.requiredStaff ?? r.required_staff ?? 0,
        status: r.status || "-",
        simulationStartDate: r.simulationStartDate || r.simulation_start_date,
        workTime: r.workTime ?? r.work_time ?? 0,
      }));

      setData(normalized);
      setSelected(new Set());
      setPageIndex(0);
    } catch (e) {
      setErr(e?.message || "조회 실패");
      setData([]);
      setSelected(new Set());
      setPageIndex(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 검색 필터
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return data;

    return data.filter((r) => {
      return (
        String(r.title).toLowerCase().includes(kw) ||
        String(r.memberName).toLowerCase().includes(kw) ||
        String(r.status).toLowerCase().includes(kw)
      );
    });
  }, [data, q]);

  const totalRows = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageIndex, pageSize]);

  //  페이지 바뀌면 선택은 페이지 기준으로 초기화해도 됨 (Product 느낌)
  useEffect(() => {
    setSelected(new Set());
  }, [pageIndex]);

  // 전체선택/부분선택
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

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  // 생성
  async function onCreate() {
    if (!canEdit) return;
    if (!newForm.title.trim()) {
      alert("제목 입력해줘!");
      return;
    }

    try {
      await createSimulation(
        {
          title: newForm.title.trim(),
          description: newForm.description || "",
          requiredStaff: Number(newForm.requiredStaff || 0),
          simulationStartDate: newForm.simulationStartDate,
        },
        token,
      );

      setOpenNew(false);
      setNewForm({
        title: "",
        description: "",
        requiredStaff: 1,
        simulationStartDate: fmtDate(new Date().toISOString()),
      });

      await refresh();
    } catch (e) {
      alert(e?.message || "생성 실패");
    }
  }

  // READY 클릭 -> PENDING 즉시 반영
  async function onRun(simId, rowRid) {
    if (!canEdit) return;
    if (!confirm("시뮬레이션 실행 요청 할까?")) return;

    // 즉시 UI 변경
    setData((prev) =>
      prev.map((r) => (r._rid === rowRid ? { ...r, status: "PENDING" } : r)),
    );

    try {
      await runSimulation(simId, token);
      await refresh();
    } catch (e) {
      await refresh();
      alert(e?.message || "실행 실패");
    }
  }

  // 선택 삭제 (상세 옆 쓰레기통 X, Product처럼 상단 버튼)
  async function deleteSelectedHandle() {
    if (!canEdit) return;
    if (selected.size === 0) return;

    if (!confirm(`선택 ${selected.size}건 삭제할까?`)) return;

    const selectedIds = data
      .filter((r) => selected.has(r._rid))
      .map((r) => r.id)
      .filter(Boolean);

    try {
      await Promise.all(selectedIds.map((id) => deleteSimulation(id, token)));
      await refresh();
    } catch (e) {
      alert(e?.message || "삭제 실패");
      await refresh();
    }
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

      {/* 상단 바 (선택/삭제 + 검색 + 생성) */}
      <div className="flex items-center justify-between gap-3 px-4">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
          <span>총 {totalRows.toLocaleString()}건</span>
          <span className="mx-1 h-4 w-px bg-gray-200" />
          <span>선택 {selectedCount.toLocaleString()}건</span>
          <span className="mx-1 h-4 w-px bg-gray-200" />

          <button
            type="button"
            onClick={deleteSelectedHandle}
            disabled={!canEdit || selectedCount === 0}
            className={[
              "h-8 rounded-md border px-3 text-sm transition",
              !canEdit || selectedCount === 0
                ? "bg-white text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                : "bg-white text-red-500 border-red-200 hover:bg-red-50 cursor-pointer",
            ].join(" ")}
            title={!canEdit ? "권한 없음" : ""}
          >
            선택 삭제
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-[320px]">
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

      {/* 에러 */}
      {err && (
        <div className="px-4 pt-3">
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        </div>
      )}
      <div className="px-4 pt-4">
        {/* ✅ 표 박스: 라운드 + border + 흰색 (페이지네이션은 밖으로 뺌) */}
        <div className="rounded-lg border bg-white overflow-hidden min-h-[520px]">
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
                <th className="min-w-[90px] border-b px-3 py-3 font-medium text-right">
                  제품수
                </th>
                <th className="min-w-[90px] border-b px-3 py-3 font-medium text-right">
                  필요인원
                </th>
                <th className="min-w-[120px] border-b px-3 py-3 font-medium">
                  상태
                </th>
                <th className="min-w-[120px] border-b px-3 py-3 font-medium">
                  시작일
                </th>
                <th className="min-w-[90px] border-b px-3 py-3 pr-5 font-medium text-right">
                  workTime
                </th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="border-b px-3 py-10 text-center">
                    <span className="text-gray-500">불러오는 중...</span>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border-b px-3 py-10 text-center">
                    <span className="text-gray-500">데이터 없음</span>
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const st = String(r.status || "").toUpperCase();
                  const isReady = st === "READY";
                  const isPending = st === "PENDING";

                  const goDetail = () => {
                    // ✅ 원하는 곳으로 바꿔
                    router.push(`/gantt?simId=${encodeURIComponent(r.id)}`);
                    // router.push(`/simulation/${r.id}`);
                  };

                  return (
                    <tr
                      key={r._rid}
                      role="button"
                      tabIndex={0}
                      onClick={goDetail}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") goDetail();
                      }}
                      className={[
                        "cursor-pointer hover:bg-slate-200/80",
                        selected.has(r._rid) ? "bg-slate-100" : "",
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
                            checked={selected.has(r._rid)}
                            onChange={(e) =>
                              toggleOne(r._rid, e.target.checked)
                            }
                          />
                        </div>
                      </td>

                      <td className="border-b px-3 py-3 font-mono text-xs text-gray-700">
                        {r.id}
                      </td>

                      {/* ✅ 제목: 버튼 없애고 그냥 텍스트(Workbench 느낌) */}
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
                        {Number(r.productCount || 0)}
                      </td>

                      <td className="border-b px-3 py-3 text-right tabular-nums">
                        {Number(r.requiredStaff || 0)}
                      </td>

                      {/* 상태 pill: 클릭해도 row 이동 안 되게 */}
                      <td
                        className="border-b px-3 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <StatusPill
                          status={r.status}
                          clickable={canEdit && isReady && !isPending}
                          onClick={() => onRun(r.id, r._rid)}
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

        {/* ✅ 페이지네이션: Product처럼 "표 박스 밖" + 배경 없음 */}
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

      {/* 생성 모달 */}
      {openNew && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpenNew(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-lg border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="font-semibold">시뮬레이션 생성</div>
              <button
                type="button"
                onClick={() => setOpenNew(false)}
                className="h-8 px-3 text-[12px] rounded-md transition text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                닫기
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">제목</div>
                <input
                  value={newForm.title}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, title: e.target.value }))
                  }
                  className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm"
                  placeholder="예) 테스트 시뮬레이션"
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">설명</div>
                <input
                  value={newForm.description}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, description: e.target.value }))
                  }
                  className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm"
                  placeholder="설명"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    필요 인원(requiredStaff)
                  </div>
                  <input
                    type="number"
                    value={newForm.requiredStaff}
                    onChange={(e) =>
                      setNewForm((s) => ({
                        ...s,
                        requiredStaff: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm"
                    min={0}
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    시작일(simulationStartDate)
                  </div>
                  <input
                    type="date"
                    value={newForm.simulationStartDate}
                    onChange={(e) =>
                      setNewForm((s) => ({
                        ...s,
                        simulationStartDate: e.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenNew(false)}
                className="h-8 px-3 text-[12px] rounded-md transition text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                취소
              </button>

              <button
                type="button"
                onClick={onCreate}
                className="h-8 rounded-md border transition border-gray-200 bg-white px-4 text-sm hover:bg-gray-100 cursor-pointer"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
