// src/components/topbar.js
import { LogOut, ChevronDown, Bell, Link } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useToken } from "@/stores/account-store";
import { getNoticeNotifications } from "@/api/notice-api";
import TopBarSearch from "@/components/topbar-search";

/* =========================
 * TopBar
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
    clearToken();
    clearAccount();
    router.push("/login");
  }

  //  공지 ID 추출 (알림의 id는 "알림 id"일 수 있으므로)
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

  // ESC 닫기 (공통)
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

  function onClickAlarmItem(item) {
    const noticeId = extractNoticeId(item);

    if (!noticeId) {
      console.warn("noticeId 추출 실패:", item);
      return;
    }

    setAlarmOpen(false);

    //
    router.push(`/notice/${noticeId}`);
  }

  function closeOthers() {
    setOpen(false);
    setAlarmOpen(false);
  }

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-50
        h-14
        bg-white/85 backdrop-blur
        border-b border-slate-200/70
      "
    >
      <div className="h-full w-full px-6 flex items-center justify-between gap-6">
        {/* 왼쪽: 로고 + 검색 */}
        <div className="flex items-center gap-14 flex-1 min-w-0">
          <div
            className="h-19 flex items-center justify-center cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            <img
              src="/images/cell-phone.png"
              alt="Logo"
              className="h-full w-auto object-contain block select-none -mt-1"
              draggable={false}
            />
          </div>

          {/*  검색은 분리 컴포넌트 */}
          <TopBarSearch token={token} onCloseOthers={closeOthers} />
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
                    w-[330px]
                    rounded-2xl
                    border border-slate-200
                    bg-white
                    shadow-xl
                    overflow-hidden
                  "
                >
                  <div className="px-4 py-3 border-b bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-medium text-slate-900">
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
                    rounded-lg
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
