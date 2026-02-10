import { Search, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useToken } from "@/stores/account-store";
import { Bell } from "lucide-react";
import { getNoticeNotifications } from "@/api/notice-api";

export default function TopBar() {
  const router = useRouter();
  const [alarmCount, setAlarmCount] = useState(0);

  const { account, clearAccount } = useAccount();
  const { token, clearToken } = useToken();

  const isLogin = !!token;

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
    clearToken();
    clearAccount();
    router.push("/login");
  }

  useEffect(() => {
    function onDown(e) {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    if (!token) return;

    async function loadAlarm() {
      try {
        const res = await getNoticeNotifications(token);

        // unreadCount 기준
        if (typeof res?.unreadCount === "number") {
          setAlarmCount(res.unreadCount);
        } else if (Array.isArray(res)) {
          // 혹시 배열로 오는 경우 대비
          const cnt = res.filter((v) => !v.read).length;
          setAlarmCount(cnt);
        }
      } catch (e) {
        console.error("알림 조회 실패:", e);
      }
    }

    loadAlarm();

    // 30초마다 갱신 (선택)
    const t = setInterval(loadAlarm, 30000);

    return () => clearInterval(t);
  }, [token]);

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

        {/* 오른쪽: 유저 메뉴 */}
        <div className="flex items-center gap-3">
          {/* 🔔 알림 버튼 */}
          {isLogin && (
            <button
              type="button"
              className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-neutral-100"
              onClick={() => router.push("/notice")} // 필요하면 알림 페이지로 이동
            >
              <Bell className="w-5 h-5 text-neutral-600" />

              {/* 빨간 숫자 */}
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
          )}

          {isLogin && (
            <div className="relative" ref={menuRef}>
              {/*  버튼 */}
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="h-8 px-3 flex items-center gap-2  cursor-pointer"
              >
                <div className="flex gap-2 leading-tight items-start ">
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

              {/* 드롭다운 */}
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
