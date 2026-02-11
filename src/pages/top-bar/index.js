import { Search, LogOut, ChevronDown, Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useToken } from "@/stores/account-store";
import { getNoticeNotifications } from "@/api/notice-api";
import { searchDashboard } from "@/api/dashboard-api";

/* =========================
 * SearchCard
 *  - ✅ 결과 없으면 카드 숨김
 * ========================= */
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
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
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
              className="w-full text-left px-3 py-2 hover:bg-slate-50 transition"
            >
              <div className="text-[12px] text-slate-800 truncate">{label}</div>
              {sub ? (
                <div className="mt-0.5 text-[10px] text-slate-400 truncate">
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
 * TopBar
 *  - ✅ 결과 있는 카드만 노출
 *  - ✅ 공지/알림 클릭 시 /notice?focus=ID 로 연결 (404 방지 + 모달 오픈 유도)
 * ========================= */
export default function TopBar() {
  const router = useRouter();

  const { account, clearAccount } = useAccount();
  const { token, clearToken } = useToken();
  const isLogin = !!token;

  // 알림
  const [alarmCount, setAlarmCount] = useState(0);
  const [alarmOpen, setAlarmOpen] = useState(false);
  const alarmRef = useRef(null);
  const [alarmList, setAlarmList] = useState([]);

  // 유저 메뉴
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // 검색
  const searchWrapRef = useRef(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  // ====== 역할 ======
  const roleLabel =
    account?.role === "ADMIN"
      ? "ADMIN"
      : account?.role === "PLANNER"
        ? "PLANNER"
        : account?.role === "WORKER"
          ? "WORKER"
          : "";

  const roleBadgeClass =
    account?.role === "ADMIN"
      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
      : account?.role === "PLANNER"
        ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
        : "bg-slate-50 text-slate-700 ring-1 ring-slate-200";

  function logout() {
    setOpen(false);
    setAlarmOpen(false);
    setSearchOpen(false);
    clearToken();
    clearAccount();
    router.push("/login");
  }

  // ✅ 공지 ID 추출 (알림의 id는 "알림 id"일 수 있어서 절대 공지 id로 쓰지 않음)
  function extractNoticeId(item) {
    const direct = item?.noticeId ?? item?.notice_id;
    if (direct != null && String(direct).trim() !== "") return String(direct);

    const link = item?.link;
    if (link) {
      const s = String(link);
      let m = s.match(/\/notices\/(\d+)/);
      if (m?.[1]) return m[1];
      m = s.match(/\/notice\/(\d+)/);
      if (m?.[1]) return m[1];
    }
    return "";
  }

  function isItemRead(item) {
    const v = item?.read ?? item?.isRead ?? item?.is_read;
    return Boolean(v);
  }

  function fmtTime(v) {
    const t = v?.createdAt ?? v?.created_at ?? v?.time ?? v?.timestamp;
    const ms = new Date(t || 0).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return "";
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}.${dd} ${hh}:${mi}`;
  }

  // ====== 알림 로드 ======
  async function loadAlarm() {
    if (!token) return;

    try {
      const res = await getNoticeNotifications(token);

      if (res && typeof res === "object" && !Array.isArray(res)) {
        if (typeof res?.unreadCount === "number")
          setAlarmCount(res.unreadCount);
        const items = Array.isArray(res?.items) ? res.items : [];
        setAlarmList(items);
        return;
      }

      if (Array.isArray(res)) {
        const unread = res.filter((v) => !isItemRead(v)).length;
        setAlarmCount(unread);

        const sorted = [...res].sort((a, b) => {
          const ta = new Date(a?.createdAt || a?.created_at || 0).getTime();
          const tb = new Date(b?.createdAt || b?.created_at || 0).getTime();
          return tb - ta;
        });

        setAlarmList(sorted);
      }
    } catch (e) {
      console.error("알림 조회 실패:", e);
    }
  }

  // ====== 통합 검색 실행 ======
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
      setSearchResult(json || {});
      setSearchOpen(true);
    } catch (e) {
      console.error("검색 실패:", e);
      setSearchError(e?.message || "검색 실패");
      setSearchResult(null);
      setSearchOpen(true);
    } finally {
      setSearchLoading(false);
    }
  }

  // ✅ 입력 멈추면 자동 검색
  useEffect(() => {
    if (!token) return;
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
  }, [searchValue, token]);

  // 최초 + 주기적 갱신 (알림)
  useEffect(() => {
    if (!token) return;

    loadAlarm();
    const t = setInterval(loadAlarm, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 바깥 클릭 닫기 (유저 메뉴)
  useEffect(() => {
    function onDown(e) {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // 바깥 클릭 닫기 (알림)
  useEffect(() => {
    function onDown(e) {
      if (!alarmOpen) return;
      if (alarmRef.current && !alarmRef.current.contains(e.target))
        setAlarmOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [alarmOpen]);

  // 바깥 클릭 닫기 (검색)
  useEffect(() => {
    function onDown(e) {
      if (!searchOpen) return;
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target))
        setSearchOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [searchOpen]);

  // ESC 닫기 (공통)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        setAlarmOpen(false);
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ 알림 클릭: 공지 상세 페이지가 없으므로 focus로 이동
  function onClickAlarmItem(item) {
    const noticeId = extractNoticeId(item);
    if (!noticeId) {
      console.warn("noticeId 추출 실패:", item);
      return;
    }
    setAlarmOpen(false);
    router.push(`/notice?focus=${encodeURIComponent(String(noticeId))}`);
  }

  // ====== 검색 결과 getter ======
  const notices = searchResult?.notices?.noticeList ?? [];
  const noticeTotal =
    searchResult?.notices?.totalNoticeCount ??
    searchResult?.notices?.totalCount ??
    notices.length ??
    0;

  const communities = searchResult?.communities?.communityList ?? [];
  const communityTotal =
    searchResult?.communities?.totalCount ?? communities.length ?? 0;

  const products = searchResult?.products?.productList ?? [];
  const tasks = searchResult?.tasks?.taskList ?? [];
  const operations = searchResult?.operations?.operationList ?? [];
  const simulations = searchResult?.simulations?.simulationScheduleList ?? [];
  const machines = searchResult?.machines?.machineList ?? [];
  const members = searchResult?.members?.memberList ?? [];

  // ✅ 라우팅 규칙:
  // - 공지: /notice?focus=ID (상세 페이지 없음, 목록이 모달 열게)
  // - 커뮤니티: /board/${id} (상세 페이지가 있을 때만)
  // - 그 외: 일단 /xxx?focus=ID 로 (해당 페이지에서 focus 지원하면 연결됨)
  const sections = [
    {
      key: "notice",
      title: "공지사항",
      count: noticeTotal,
      items: notices,
      onMore: () => {
        setSearchOpen(false);
        router.push(`/notice?keyword=${encodeURIComponent(searchValue)}`);
      },
      onClick: (id) => {
        setSearchOpen(false);
        router.push(`/notice?focus=${encodeURIComponent(String(id))}`);
      },
      getId: (x) => x?.id ?? x?.noticeId ?? x?.notice_id,
      getTitle: (x) => x?.title ?? x?.noticeTitle ?? "(제목 없음)",
      getSub: (x) =>
        x?.createdAt || x?.date ? String(x?.createdAt || x?.date) : "",
    },
    {
      key: "community",
      title: "커뮤니티",
      count: communityTotal,
      items: communities,
      onMore: () => {
        setSearchOpen(false);
        router.push(`/board?keyword=${encodeURIComponent(searchValue)}`);
      },
      onClick: (id) => {
        setSearchOpen(false);
        router.push(`/board/${id}`);
      },
      getId: (x) => x?.id ?? x?.communityId ?? x?.community_id,
      getTitle: (x) => x?.title ?? x?.subject ?? "(제목 없음)",
    },
    {
      key: "product",
      title: "제품",
      count: products.length,
      items: products,
      onMore: () => {
        setSearchOpen(false);
        router.push(`/product?keyword=${encodeURIComponent(searchValue)}`);
      },
      onClick: (id) => {
        setSearchOpen(false);
        router.push(`/product?focus=${encodeURIComponent(String(id))}`);
      },
      getId: (x) => x?.id ?? x?.productId ?? x?.product_id,
      getTitle: (x) => x?.name ?? x?.productName ?? "(이름 없음)",
    },
    {
      key: "task",
      title: "작업(Task)",
      count: tasks.length,
      items: tasks,
      onMore: () => {
        setSearchOpen(false);
        router.push(`/task?keyword=${encodeURIComponent(searchValue)}`);
      },
      onClick: (id) => {
        setSearchOpen(false);
        router.push(`/task?focus=${encodeURIComponent(String(id))}`);
      },
      getId: (x) => x?.id ?? x?.taskId ?? x?.task_id,
      getTitle: (x) => x?.taskName ?? x?.name ?? x?.description ?? "(작업)",
    },
    {
      key: "operation",
      title: "오퍼레이션",
      count: operations.length,
      items: operations,
      onMore: () => {
        setSearchOpen(false);
        router.push(`/operation?keyword=${encodeURIComponent(searchValue)}`);
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
        router.push(`/simulation?keyword=${encodeURIComponent(searchValue)}`);
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
      title: "머신",
      count: machines.length,
      items: machines,
      onMore: () => {
        setSearchOpen(false);
        router.push(`/machine?keyword=${encodeURIComponent(searchValue)}`);
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
      title: "멤버",
      count: members.length,
      items: members,
      onMore: () => {
        setSearchOpen(false);
        router.push(`/member?keyword=${encodeURIComponent(searchValue)}`);
      },
      onClick: (id) => {
        setSearchOpen(false);
        router.push(`/member?focus=${encodeURIComponent(String(id))}`);
      },
      getId: (x) => x?.id ?? x?.memberId ?? x?.member_id,
      getTitle: (x) => x?.name ?? x?.memberName ?? "(멤버)",
    },
  ];

  const visibleSections = sections.filter((s) => {
    const list = Array.isArray(s.items) ? s.items : [];
    const c = Number(s.count ?? list.length ?? 0);
    return c > 0 && list.length > 0;
  });

  const hasAnyResult = visibleSections.length > 0;

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-50
        h-14
        bg-white/85 backdrop-blur
        border-b border-slate-200/70
      "
    >
      <div className="h-full w-full px-7 flex items-center justify-between gap-6">
        {/* 왼쪽: 로고 + 검색 */}
        <div className="flex items-center gap-10 flex-1 min-w-0">
          <div className="h-12 flex items-center justify-center shrink-0">
            <img
              src="/images/phoneflow-logo.png"
              alt="Logo"
              className="h-8 w-auto max-w-30 object-contain block select-none"
              draggable={false}
            />
          </div>

          {/* 검색창 + 결과 */}
          <div
            className="relative flex-1 max-w-[520px] min-w-[240px]"
            ref={searchWrapRef}
          >
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
                className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 cursor-pointer"
                onClick={() => runSearch(searchValue)}
              />

              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => {
                  setOpen(false);
                  setAlarmOpen(false);
                  if (searchResult) setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch(searchValue);
                  if (e.key === "Escape") setSearchOpen(false);
                }}
                className="
                  w-full
                  text-sm
                  outline-none
                  placeholder:text-slate-400
                  placeholder:text-[12px]
                  bg-transparent
                "
                placeholder="검색어를 입력하세요 (Enter)"
              />

              {searchLoading && (
                <span className="text-[11px] text-slate-400">검색중…</span>
              )}
            </div>

            {searchOpen && (
              <div className="absolute left-0 mt-2 w-[720px] max-w-[85vw] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                {/* 헤더 */}
                <div className="px-4 py-3 border-b border-slate-100 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-semibold text-slate-900">
                      통합 검색
                    </div>
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-[12px] text-slate-400 hover:text-slate-600"
                    >
                      닫기
                    </button>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400 truncate">
                    키워드:{" "}
                    <span className="text-slate-700 font-medium">
                      {searchValue}
                    </span>
                  </div>
                </div>

                {/* 바디 */}
                <div className="max-h-[520px] overflow-y-auto">
                  {searchError ? (
                    <div className="px-4 py-10 text-center text-[12px] text-red-600">
                      {searchError}
                    </div>
                  ) : !searchResult ? (
                    <div className="px-4 py-10 text-center text-[12px] text-slate-400">
                      검색 결과가 없습니다.
                    </div>
                  ) : !hasAnyResult ? (
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
                <div className="px-4 py-3 border-t bg-white flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Enter로 검색 · 항목 클릭으로 이동
                  </div>
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700"
                    onClick={() => {
                      setSearchOpen(false);
                      router.push(
                        `/dashboard?keyword=${encodeURIComponent(searchValue)}`,
                      );
                    }}
                  >
                    전체 보기 →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 알림 + 유저 메뉴 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 알림 */}
          {isLogin && (
            <div className="relative" ref={alarmRef}>
              <button
                type="button"
                className="
                  relative
                  w-9 h-9
                  flex items-center justify-center
                  rounded-xl
                  border border-transparent
                  hover:bg-slate-100
                  active:scale-[0.98]
                  transition
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30
                "
                onClick={() => {
                  setOpen(false);
                  setSearchOpen(false);
                  setAlarmOpen((v) => {
                    const next = !v;
                    if (!v) loadAlarm();
                    return next;
                  });
                }}
                aria-label="알림"
              >
                <Bell className="w-[18px] h-[18px] text-slate-600" />

                {alarmCount > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-1
                      min-w-[18px] h-[18px]
                      px-[5px]
                      rounded-full
                      bg-red-500
                      text-white
                      text-[10px]
                      font-extrabold
                      flex items-center justify-center
                      shadow
                    "
                  >
                    {alarmCount > 99 ? "99+" : alarmCount}
                  </span>
                )}
              </button>

              {alarmOpen && (
                <div
                  className="
                    absolute right-0 mt-2
                    w-[360px]
                    rounded-2xl
                    border border-slate-200
                    bg-white
                    shadow-xl
                    overflow-hidden
                  "
                >
                  <div className="px-4 py-3 border-b bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold text-slate-900">
                        알림
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {alarmList.length}건
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      항목을 클릭하면 공지 상세(모달)로 이동합니다.
                    </div>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {alarmList.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[12px] text-slate-400">
                        새로운 알림이 없습니다.
                      </div>
                    ) : (
                      alarmList.slice(0, 30).map((it, idx) => {
                        const title = it?.message ?? it?.title ?? "(제목 없음)";
                        const read = isItemRead(it);
                        const alarmRowKey = it?.id ?? idx;

                        return (
                          <button
                            key={alarmRowKey}
                            type="button"
                            onClick={() => onClickAlarmItem(it)}
                            className={[
                              "w-full text-left px-4 py-3",
                              "border-b last:border-b-0 border-slate-100",
                              "hover:bg-slate-50 transition",
                            ].join(" ")}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={[
                                  "mt-1.5 h-2.5 w-2.5 rounded-full shrink-0",
                                  read ? "bg-slate-200" : "bg-red-500",
                                ].join(" ")}
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div
                                    className={[
                                      "text-[12px] truncate",
                                      read
                                        ? "font-normal text-slate-700"
                                        : "font-semibold text-slate-900",
                                    ].join(" ")}
                                  >
                                    {title}
                                  </div>

                                  <div className="shrink-0 text-[10px] text-slate-400">
                                    {fmtTime(it)}
                                  </div>
                                </div>

                                <div className="mt-1 flex items-center gap-2">
                                  <span
                                    className={[
                                      "text-[10px] px-2 py-0.5 rounded-full ring-1",
                                      read
                                        ? "text-slate-500 ring-slate-200 bg-slate-50"
                                        : "text-red-700 ring-red-200 bg-red-50",
                                    ].join(" ")}
                                  >
                                    {read ? "읽음" : "안읽음"}
                                  </span>

                                  <span className="text-[10px] text-slate-400">
                                    공지사항
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="px-4 py-3 border-t bg-white flex items-center justify-between">
                    <div className="text-[11px] text-slate-400">
                      최신 30건까지 표시합니다.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAlarmOpen(false);
                        router.push("/notice");
                      }}
                      className="
                        text-[12px] font-semibold text-indigo-600
                        hover:text-indigo-700
                      "
                    >
                      공지로 이동 →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 유저 메뉴 */}
          {isLogin && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  setAlarmOpen(false);
                  setSearchOpen(false);
                  setOpen((v) => !v);
                }}
                className="
                  h-9 px-2.5
                  flex items-center gap-2
                  rounded-xl
                  hover:bg-slate-100
                  active:scale-[0.98]
                  transition
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30
                "
              >
                <div className="flex flex-col items-start leading-tight">
                  <div className="flex items-center gap-2">
                    {roleLabel && (
                      <span
                        className={[
                          "text-[10px] px-2 py-0.5 rounded-full",
                          roleBadgeClass,
                        ].join(" ")}
                      >
                        {roleLabel}
                      </span>
                    )}
                    <div className="text-[12px] font-semibold text-slate-800 max-w-[120px] truncate">
                      {account?.name || "작업자"}
                    </div>
                  </div>
                </div>

                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {open && (
                <div
                  className="
                    absolute right-0 mt-2 w-44
                    rounded-2xl
                    border border-slate-200
                    bg-white
                    shadow-xl
                    overflow-hidden
                  "
                >
                  <button
                    type="button"
                    onClick={logout}
                    className="
                      w-full px-4 py-3
                      text-xs text-left
                      flex items-center gap-2
                      hover:bg-slate-50
                      cursor-pointer
                      text-slate-700
                      hover:text-red-600
                      transition
                    "
                  >
                    <LogOut className="w-4 h-4 text-current" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
