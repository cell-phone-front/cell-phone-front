// src/components/topbar-search.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Search, X } from "lucide-react";
import { searchDashboard } from "@/api/dashboard-api";

/* =========================
 * SearchCard
========================= */
function SearchCard({
  title,
  count,
  items,
  onMore,
  onClickItem,
  getId,
  getTitle,
  getSub,
  hideWhenEmpty = true,
}) {
  const list = Array.isArray(items) ? items : [];
  const top = list.slice(0, 6);
  const c = Number(count ?? list.length ?? 0);

  if (hideWhenEmpty && (c <= 0 || top.length === 0)) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div className="text-[12px] font-semibold text-slate-900">
          {title}
          <span className="ml-2 text-[11px] font-medium text-slate-400">
            {c}
          </span>
        </div>

        <button
          type="button"
          onClick={onMore}
          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
        >
          더보기
        </button>
      </div>

      <div className="py-1">
        {top.map((it, idx) => {
          const id = getId?.(it);
          const label = getTitle?.(it) ?? "(제목 없음)";
          const sub = getSub?.(it);
          const key = id != null ? `${title}-${id}` : `${title}-x-${idx}`;

          return (
            <button
              key={key}
              type="button"
              onClick={() => id != null && onClickItem?.(id, it)}
              className="w-full px-3 py-2 text-left transition hover:bg-slate-50"
            >
              <div className="truncate text-[12px] text-slate-800">{label}</div>
              {sub ? (
                <div className="mt-0.5 truncate text-[10px] text-slate-400">
                  {sub}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
 * TopBarSearch
 *  - 공지사항/게시판은 키워드 검색에서 제외
 *  - ProductRouting 응답 키(productRouting.productRoutingList) 반영
========================= */
export default function TopBarSearch({ token, onCloseOthers }) {
  const router = useRouter();
  const searchWrapRef = useRef(null);
  const inputRef = useRef(null);

  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  // ✅ X 누르면 전체보기 모드
  const [showAll, setShowAll] = useState(false);

  // ✅ "마지막으로 성공적으로 검색한 키워드"
  const [lastKeyword, setLastKeyword] = useState("");

  async function runSearch(v) {
    if (!token) return;

    const kw = String(v || "").trim();
    if (!kw) {
      setSearchResult(null);
      setSearchOpen(false);
      setSearchError("");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    try {
      const json = await searchDashboard(token, kw);

      console.log("TOPBAR keyword =", kw);
      console.log("TOPBAR searchResult.machines =", json?.machines);
      console.log("TOPBAR machineList =", json?.machines?.machineList);
      console.log("TOPBAR keys =", Object.keys(json || {}));
      setSearchResult(json || {});
      setSearchOpen(true);
      setLastKeyword(kw);
    } catch (e) {
      console.error("검색 실패:", e);
      setSearchError(e?.message || "검색 실패");
      setSearchResult(null);
      setSearchOpen(true);
    } finally {
      setSearchLoading(false);
    }
  }

  // ✅ 입력 멈추면 자동 검색 (showAll 아닐 때만)
  useEffect(() => {
    if (!token) return;
    if (showAll) return;

    const kw = String(searchValue || "").trim();
    const t = setTimeout(() => {
      if (!kw) {
        setSearchResult(null);
        setSearchOpen(false);
        setSearchError("");
        return;
      }
      runSearch(kw);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, token, showAll]);

  // ✅ 바깥 클릭 닫기
  useEffect(() => {
    function onDown(e) {
      if (!searchOpen) return;
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [searchOpen]);

  // ✅ ESC 닫기
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* =========================
   * 응답 파싱 (키 후보 최대한 흡수)
  ========================= */

  // ===== Notices =====
  const notices = searchResult?.notices?.noticeList ?? [];
  const noticeTotal =
    searchResult?.notices?.totalNoticeCount ??
    searchResult?.notices?.totalCount ??
    notices.length ??
    0;

  // ===== Communities =====
  const communities = searchResult?.communities?.communityList ?? [];
  const communityTotal =
    searchResult?.communities?.totalCount ?? communities.length ?? 0;

  // ===== Products =====
  const products = searchResult?.products?.productList ?? [];

  // ===== Tasks =====
  const tasks = searchResult?.tasks?.taskList ?? [];

  // ===== Operations =====
  const operations = searchResult?.operations?.operationList ?? [];

  // ===== Simulations =====
  const simulations = searchResult?.simulations?.simulationScheduleList ?? [];

  // ===== Machines =====
  const machines = searchResult?.machines?.machineList ?? [];

  // ===== Members =====
  const members = searchResult?.members?.memberList ?? [];

  // ===== Product Routing =====
  const productRoutings =
    searchResult?.productRouting?.productRoutingList ?? [];

  const productRoutingTotal =
    searchResult?.productRouting?.totalCount ?? productRoutings.length ?? 0;

  // ✅ /tasks 이동 유틸
  const goTasks = (q) => {
    const same = router.pathname === "/tasks";

    const safeQuery = {};
    Object.entries(q || {}).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (!s) return;
      safeQuery[k] = s;
    });

    const nav = same ? router.replace : router.push;

    nav(
      { pathname: "/tasks", query: safeQuery },
      undefined,
      same ? { shallow: true, scroll: false } : undefined,
    );

    setSearchOpen(false);
  };

  // ✅ 전체보기 기준 키워드
  const kwForAll =
    String(searchValue || "").trim() || String(lastKeyword || "").trim();
  const kwEncoded = encodeURIComponent(kwForAll);

  /* =========================
   * 섹션 구성
   *  - "공지사항/게시판 제외" => sections에서만 제외
  ========================= */

  const sections = useMemo(() => {
    const kw = encodeURIComponent(String(searchValue || "").trim());

    return [
      {
        key: "product",
        title: "생산 대상",
        count: products.length,
        items: products,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/product?keyword=${kw}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/product?focus=${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.productId ?? x?.product_id,
        getTitle: (x) => x?.name ?? x?.productName ?? "(이름 없음)",
      },

      {
        key: "product-routing",
        title: "공정 순서 관리",
        count: productRoutingTotal,
        items: productRoutings,
        onMore: () => {
          setSearchOpen(false);
          router.push(
            `/product-routing?keyword=${encodeURIComponent(searchValue)}`,
          );
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(
            `/product-routing?focus=${encodeURIComponent(String(id))}`,
          );
        },
        getId: (x) =>
          x?.id ??
          x?.productRoutingId ??
          x?.routingId ??
          x?.product_routing_id ??
          x?.routing_id,
        getTitle: (x) =>
          x?.name ??
          x?.routingName ??
          x?.title ??
          x?.productId ??
          x?.operationId ??
          "(Routing)",
        getSub: (x) => {
          const pid = x?.productId ?? x?.product_id;
          const oid = x?.operationId ?? x?.operation_id;
          const seq =
            x?.operationSeq ?? x?.operation_seq ?? x?.seq ?? x?.sequence;
          const desc = x?.description ?? x?.desc;
          const a = [
            pid && `P:${pid}`,
            oid && `O:${oid}`,
            seq != null && `SEQ:${seq}`,
          ]
            .filter(Boolean)
            .join(" · ");
          return desc ? (a ? `${a} · ${desc}` : String(desc)) : a;
        },
      },

      {
        key: "task",
        title: "매칭 작업",
        count: tasks.length,
        items: tasks,
        onMore: () => goTasks({ keyword: String(searchValue || "").trim() }),
        onClick: (id) => goTasks({ focus: String(id) }),
        getId: (x) => x?.id ?? x?.taskId ?? x?.task_id,
        getTitle: (x) => x?.taskName ?? x?.name ?? x?.description ?? "(작업)",
      },

      {
        key: "operation",
        title: "공정 단계",
        count: operations.length,
        items: operations,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/operation?keyword=${kw}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/operation?focus=${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.operationId ?? x?.operation_id,
        getTitle: (x) =>
          x?.operationName ?? x?.name ?? x?.description ?? "(오퍼레이션)",
      },

      {
        key: "simulation",
        title: "시뮬레이션",
        count: simulations.length,
        items: simulations,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/simulation?keyword=${kw}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          // ✅ keyword + focus 같이
          router.push(
            `/simulation?keyword=${kw}&focus=${encodeURIComponent(String(id))}`,
          );
        },
        getId: (x) =>
          x?.id ??
          x?.simulationId ??
          x?.simulation_id ??
          x?.simulationScheduleId ??
          x?.simulation_schedule_id,
        getTitle: (x) =>
          x?.title ?? x?.name ?? x?.simulationName ?? "(시뮬레이션)",
        getSub: (x) => {
          const st = x?.status ? `상태:${x.status}` : "";
          const d = x?.simulationStartDate
            ? `시작:${x.simulationStartDate}`
            : "";
          const pc = x?.productCount != null ? `제품:${x.productCount}` : "";
          return [st, d, pc].filter(Boolean).join(" · ");
        },
      },

      {
        key: "machine",
        title: "기계",
        count: machines.length,
        items: machines,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/machine?keyword=${kw}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          // ✅ focus만 보내지 말고 keyword도 같이 보내기
          router.push(
            `/machine?keyword=${kw}&focus=${encodeURIComponent(String(id))}`,
          );
        },
        getId: (x) => x?.id ?? x?.machineId ?? x?.machine_id,
        getTitle: (x) => x?.machineName ?? x?.name ?? "(머신)",
      },

      {
        key: "member",
        title: "계정 관리",
        count: members.length,
        items: members,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/member?keyword=${kw}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/member?focus=${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.memberId ?? x?.member_id,
        getTitle: (x) => x?.name ?? x?.memberName ?? "(멤버)",
      },
    ];
  }, [
    router,
    searchValue,
    products,
    productRoutings,
    productRoutingTotal,
    tasks,
    operations,
    simulations,
    machines,
    members,
  ]);

  // ✅ 전체보기 모드: “전체”라면 공지/게시판 포함 유지(원치 않으면 여기서도 제거하시면 됩니다)
  const allSections = useMemo(() => {
    return [
      {
        key: "notice",
        title: "공지사항",
        count: noticeTotal,
        items: notices,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/notice?keyword=${kwEncoded}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/notice/${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.noticeId ?? x?.notice_id,
        getTitle: (x) => x?.title ?? x?.noticeTitle ?? "(제목 없음)",
        getSub: (x) =>
          x?.createdAt || x?.date ? String(x?.createdAt || x?.date) : "",
      },
      {
        key: "community",
        title: "자유게시판",
        count: communityTotal,
        items: communities,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/board?keyword=${kwEncoded}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/board/${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.communityId ?? x?.community_id,
        getTitle: (x) => x?.title ?? x?.subject ?? "(제목 없음)",
      },

      {
        key: "product",
        title: "생산 대상",
        count: products.length,
        items: products,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/product?keyword=${kwEncoded}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/product?focus=${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.productId ?? x?.product_id,
        getTitle: (x) => x?.name ?? x?.productName ?? "(이름 없음)",
      },

      {
        key: "product-routing",
        title: "공정 순서 관리",
        count: productRoutingTotal,
        items: productRoutings,
        onMore: () => {
          setSearchOpen(false);
          router.push("/product-routing");
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(
            `/product-routing?focus=${encodeURIComponent(String(id))}`,
          );
        },
        getId: (x) =>
          x?.id ??
          x?.productRoutingId ??
          x?.routingId ??
          x?.product_routing_id ??
          x?.routing_id,
        getTitle: (x) =>
          x?.name ??
          x?.routingName ??
          x?.title ??
          x?.productId ??
          x?.operationId ??
          "(Routing)",
        getSub: (x) => {
          const pid = x?.productId ?? x?.product_id;
          const oid = x?.operationId ?? x?.operation_id;
          const seq =
            x?.operationSeq ?? x?.operation_seq ?? x?.seq ?? x?.sequence;
          const desc = x?.description ?? x?.desc;
          const a = [
            pid && `P:${pid}`,
            oid && `O:${oid}`,
            seq != null && `SEQ:${seq}`,
          ]
            .filter(Boolean)
            .join(" · ");
          return desc ? (a ? `${a} · ${desc}` : String(desc)) : a;
        },
      },

      {
        key: "task",
        title: "매칭 작업",
        count: tasks.length,
        items: tasks,
        onMore: () => goTasks({ keyword: kwForAll }),
        onClick: (id) => goTasks({ focus: String(id) }),
        getId: (x) => x?.id ?? x?.taskId ?? x?.task_id,
        getTitle: (x) => x?.taskName ?? x?.name ?? x?.description ?? "(작업)",
      },

      {
        key: "operation",
        title: "공정 단계",
        count: operations.length,
        items: operations,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/operation?keyword=${kwEncoded}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/operation?focus=${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.operationId ?? x?.operation_id,
        getTitle: (x) =>
          x?.operationName ?? x?.name ?? x?.description ?? "(오퍼레이션)",
      },

      {
        key: "simulation",
        title: "시뮬레이션",
        count: simulations.length,
        items: simulations,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/simulation?keyword=${kwEncoded}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/simulation?focus=${encodeURIComponent(String(id))}`);
        },
        getId: (x) =>
          x?.id ??
          x?.simulationId ??
          x?.simulation_id ??
          x?.simulationScheduleId ??
          x?.simulation_schedule_id,
        getTitle: (x) =>
          x?.name ?? x?.title ?? x?.simulationName ?? "(시뮬레이션)",
      },

      {
        key: "machine",
        title: "기계",
        count: machines.length,
        items: machines,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/machine?keyword=${kwEncoded}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/machine?focus=${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.machineId ?? x?.machine_id,
        getTitle: (x) => x?.machineName ?? x?.name ?? "(머신)",
      },

      {
        key: "member",
        title: "계정 관리",
        count: members.length,
        items: members,
        onMore: () => {
          setSearchOpen(false);
          router.push(`/member?keyword=${kwEncoded}`);
        },
        onClick: (id) => {
          setSearchOpen(false);
          router.push(`/member?focus=${encodeURIComponent(String(id))}`);
        },
        getId: (x) => x?.id ?? x?.memberId ?? x?.member_id,
        getTitle: (x) => x?.name ?? x?.memberName ?? "(멤버)",
      },
    ];
  }, [
    router,
    kwForAll,
    kwEncoded,
    notices,
    noticeTotal,
    communities,
    communityTotal,
    products,
    productRoutings,
    productRoutingTotal,
    tasks,
    operations,
    simulations,
    machines,
    members,
  ]);

  const visibleSections = sections.filter((s) => {
    const list = Array.isArray(s.items) ? s.items : [];
    const c = Number(s.count ?? list.length ?? 0);
    return c > 0 && list.length > 0;
  });
  const hasAnyResult = visibleSections.length > 0;

  const clearToShowAll = () => {
    setSearchValue("");
    setSearchError("");
    setSearchLoading(false);

    setShowAll(true);
    setSearchOpen(true);

    const next = { ...router.query };
    const had = next.focus != null || next.keyword != null;

    delete next.focus;
    delete next.keyword;

    if (had) {
      router.replace({ pathname: router.pathname, query: next }, undefined, {
        shallow: true,
        scroll: false,
      });
    }

    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="relative flex-1 max-w-[320px]" ref={searchWrapRef}>
      {/* ================== Search Bar ================== */}
      <div
        className="
          group
          flex items-center gap-2
          h-9
          rounded-xl
          border border-slate-200
          bg-white
          px-3
          shadow-xs
          focus-within:ring-2 focus-within:ring-indigo-500/30
          focus-within:border-indigo-200
          transition
        "
      >
        <Search
          className="h-4 w-4 shrink-0 cursor-pointer text-slate-400 group-focus-within:text-indigo-500"
          onClick={() => {
            setShowAll(false);
            runSearch(searchValue);
          }}
        />

        <input
          ref={inputRef}
          value={searchValue}
          onChange={(e) => {
            setShowAll(false);
            setSearchValue(e.target.value);
          }}
          onFocus={() => {
            onCloseOthers?.();
            if (searchResult || showAll) setSearchOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setShowAll(false);
              runSearch(searchValue);
            }
            if (e.key === "Escape") setSearchOpen(false);
          }}
          className="
            flex-1 min-w-0
            bg-transparent
            text-sm text-slate-900
            outline-none
            placeholder:text-slate-400
            placeholder:text-[11px]
            h-9 leading-9 
          "
          placeholder="검색어를 입력하세요 (Enter)"
        />

        <div className="shrink-0 flex items-center gap-1">
          {searchLoading ? (
            <span className="whitespace-nowrap text-[11px] text-slate-400">
              검색중…
            </span>
          ) : (
            <button
              type="button"
              onClick={clearToShowAll}
              className={[
                "h-8 w-8 rounded-lg inline-flex items-center justify-center",
                "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              ].join(" ")}
              aria-label="전체 보기"
              title="전체 보기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ================== Dropdown ================== */}
      {searchOpen && (
        <div className="absolute left-0 mt-2 w-[720px] max-w-[85vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* 헤더 */}
          <div className="border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-slate-900">
                통합 검색
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);

                  const next = { ...router.query };
                  const had = next.focus != null || next.keyword != null;
                  delete next.focus;
                  delete next.keyword;

                  if (had) {
                    router.replace(
                      { pathname: router.pathname, query: next },
                      undefined,
                      { shallow: true, scroll: false },
                    );
                  }
                }}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="닫기"
                title="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-1 truncate text-[11px] text-slate-400">
              {showAll ? (
                <>
                  모드: <span className="font-medium text-slate-700">전체</span>
                  {kwForAll ? (
                    <>
                      {" "}
                      · 기준 키워드:{" "}
                      <span className="font-medium text-slate-700">
                        {kwForAll}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  키워드:{" "}
                  <span className="font-medium text-slate-700">
                    {searchValue}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 바디 */}
          <div className="max-h-[520px] overflow-y-auto">
            {searchError ? (
              <div className="px-4 py-10 text-center text-[12px] text-red-600">
                {searchError}
              </div>
            ) : showAll ? (
              <div className="p-3 grid grid-cols-2 gap-3">
                {allSections.map((s) => (
                  <SearchCard
                    key={s.key}
                    title={s.title}
                    count={s.count}
                    items={s.items}
                    onMore={s.onMore}
                    onClickItem={(id, it) => s.onClick?.(id, it)}
                    getId={s.getId}
                    getTitle={s.getTitle}
                    getSub={s.getSub}
                    hideWhenEmpty={false}
                  />
                ))}
              </div>
            ) : !searchResult || !hasAnyResult ? (
              <div className="px-4 py-10 text-center text-[12px] text-slate-400">
                검색 결과가 없습니다.
              </div>
            ) : (
              <div className="p-3 grid grid-cols-2 gap-3">
                {visibleSections.map((s) => (
                  <SearchCard
                    key={s.key}
                    title={s.title}
                    count={s.count}
                    items={s.items}
                    onMore={s.onMore}
                    onClickItem={(id, it) => s.onClick?.(id, it)}
                    getId={s.getId}
                    getTitle={s.getTitle}
                    getSub={s.getSub}
                    hideWhenEmpty={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between border-t bg-white px-4 py-3">
            <div className="text-[11px] text-slate-400">
              Enter로 검색 · 항목 클릭으로 이동
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
