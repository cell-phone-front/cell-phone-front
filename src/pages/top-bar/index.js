import { Search, LogOut, ChevronDown, Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useToken } from "@/stores/account-store";
import { getNoticeNotifications } from "@/api/notice-api";

export default function TopBar() {
  const router = useRouter();

  const { account, clearAccount } = useAccount();
  const { token, clearToken } = useToken();
  const isLogin = !!token;

  // ✅ 알림
  const [alarmCount, setAlarmCount] = useState(0);
  const [alarmOpen, setAlarmOpen] = useState(false);
  const alarmRef = useRef(null);
  const [alarmList, setAlarmList] = useState([]);

  // ✅ 유저 메뉴
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

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
      ? "bg-red-50 text-red-600 border-red-200"
      : account?.role === "PLANNER"
        ? "bg-blue-50 text-blue-600 border-blue-200"
        : "bg-neutral-50 text-neutral-600 border-neutral-200";

  function logout() {
    setOpen(false);
    setAlarmOpen(false);
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

  // ✅ 읽음 여부 호환
  function isItemRead(item) {
    const v = item?.read ?? item?.isRead ?? item?.is_read;
    return Boolean(v);
  }

  // ✅ 알림 로드
  async function loadAlarm() {
    if (!token) return;

    try {
      const res = await getNoticeNotifications(token);

      // 1) { unreadCount, items } 형태
      if (res && typeof res === "object" && !Array.isArray(res)) {
        if (typeof res?.unreadCount === "number")
          setAlarmCount(res.unreadCount);
        const items = Array.isArray(res?.items) ? res.items : [];
        setAlarmList(items);
        return;
      }

      // 2) 배열 형태
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

  // ✅ 최초 + 주기적 갱신
  useEffect(() => {
    if (!token) return;

    loadAlarm();
    const t = setInterval(loadAlarm, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ✅ 바깥 클릭 닫기 (유저 메뉴)
  useEffect(() => {
    function onDown(e) {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // ✅ 바깥 클릭 닫기 (알림)
  useEffect(() => {
    function onDown(e) {
      if (!alarmOpen) return;
      if (alarmRef.current && !alarmRef.current.contains(e.target))
        setAlarmOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [alarmOpen]);

  // ✅ ESC 닫기 (공통)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        setAlarmOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ 알림 클릭: 상세로 이동만 (읽음 처리는 getNoticeById 호출 시 백에서 처리됨)
  function onClickAlarmItem(item) {
    const noticeId = extractNoticeId(item);
    if (!noticeId) {
      console.warn("noticeId 추출 실패:", item);
      return;
    }

    setAlarmOpen(false);

    // ✅ 백에서 link를 "/notices/{id}"로 저장 중이면 이 경로가 맞습니다.
    router.push(`/notice/${noticeId}`);
  }

  return (
    <header className="h-14 fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 flex items-center">
      <div className="w-full px-7 flex items-center justify-between gap-6">
        {/* 왼쪽: 로고 + 검색 */}
        <div className="flex items-center gap-10 flex-1">
          <div className="h-12 flex items-center justify-center">
            <img
              src="/images/phoneflow-logo.png"
              alt="Logo"
              className="h-8 w-auto max-w-30 object-contain block"
              draggable={false}
            />
          </div>

          <div className="flex-1 max-w-90">
            <div className="flex items-center gap-5 border border-neutral-200 bg-white px-3 h-8">
              <input
                className="w-full text-sm outline-none placeholder:text-neutral-400 placeholder:text-[12px]"
                placeholder="검색어를 입력하세요"
              />
              <Search className="w-4 h-4 text-neutral-400 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* 오른쪽: 알림 + 유저 메뉴 */}
        <div className="flex items-center gap-3">
          {/* 🔔 알림 드롭다운 */}
          {isLogin && (
            <div className="relative" ref={alarmRef}>
              <button
                type="button"
                className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-neutral-100"
                onClick={() => {
                  setOpen(false);
                  setAlarmOpen((v) => {
                    const next = !v;
                    if (!v) loadAlarm();
                    return next;
                  });
                }}
                aria-label="알림"
              >
                <Bell className="w-5 h-5 text-neutral-600" />

                {alarmCount > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-1
                      min-w-[16px] h-[16px]
                      px-[4px]
                      rounded-full
                      bg-red-500
                      text-white
                      text-[10px]
                      font-bold
                      flex items-center justify-center
                    "
                  >
                    {alarmCount > 99 ? "99+" : alarmCount}
                  </span>
                )}
              </button>

              {alarmOpen && (
                <div className="absolute right-0 mt-2 w-[320px] rounded-xl border border-neutral-100 bg-white shadow-lg overflow-hidden">
                  <div className="px-3 py-2 border-b bg-white">
                    <div className="text-[12px] font-extrabold text-neutral-800">
                      알림
                      <span className="ml-2 text-[11px] font-bold text-neutral-400">
                        {alarmList.length}건
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      공지사항 제목을 클릭하면 상세로 이동합니다.
                    </div>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {alarmList.length === 0 ? (
                      <div className="px-3 py-6 text-center text-[12px] text-neutral-400">
                        새로운 알림이 없습니다.
                      </div>
                    ) : (
                      alarmList.slice(0, 20).map((it, idx) => {
                        const title = it?.message ?? it?.title ?? "(제목 없음)";
                        const read = isItemRead(it);
                        const alarmRowKey = it?.id ?? idx; // ✅ 알림 row key

                        return (
                          <button
                            key={alarmRowKey}
                            type="button"
                            onClick={() => onClickAlarmItem(it)}
                            className={[
                              "w-full text-left px-3 py-3 border-b last:border-b-0",
                              "hover:bg-neutral-50 transition",
                              read ? "bg-white" : "bg-red-50/30",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[12px] font-semibold text-neutral-800 truncate">
                                  {title}
                                </div>
                                <div className="mt-0.5 text-[11px] text-neutral-400">
                                  {read ? "읽음" : "안읽음"}
                                </div>
                              </div>

                              {!read && (
                                <span className="shrink-0 mt-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="px-3 py-2 border-t bg-white flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setAlarmOpen(false);
                        router.push("/notice");
                      }}
                      className="text-[12px] font-semibold text-neutral-600 hover:text-neutral-800"
                    >
                      공지로 이동
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
                  setOpen((v) => !v);
                }}
                className="h-8 px-3 flex items-center gap-2 cursor-pointer"
              >
                <div className="flex gap-2 leading-tight items-start">
                  {roleLabel && (
                    <span
                      className={`text-[10px] px-2 py-1 rounded-md border ${roleBadgeClass}`}
                    >
                      {roleLabel}
                    </span>
                  )}
                  <div className="text-sm text-neutral-700">
                    {account?.name || "작업자"}
                  </div>
                </div>

                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>

              {open && (
                <div className="absolute right-0 mt-1 w-40 rounded-xs border border-neutral-100 bg-white shadow-md overflow-hidden">
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full px-3 py-3 text-xs text-left flex items-center gap-2 hover:bg-neutral-50 cursor-pointer hover:text-red-500"
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
