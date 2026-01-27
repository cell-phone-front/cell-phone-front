import React from "react";
import { useRouter } from "next/router";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Clock,
  Pin,
} from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";
import { useAccount } from "@/stores/account-store";

function NoticeModal({ open, onClose, notice }) {
  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-lg border overflow-hidden"
        onClick={stop}
        role="dialog"
        aria-modal="true"
      >
        {/* 헤더 */}
        <div className="px-6 py-5 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">
              {notice?.title || "공지사항"}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex gap-3">
              <span>작성일: {notice?.date || "-"}</span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-gray-300" />
                {notice?.views ?? "-"}
              </span>
            </div>
          </div>
        </div>

        {/* 내용 */}
        <div className="px-6 py-5">
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-6">
            {notice?.content || "내용이 없습니다."}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800 active:scale-[0.99]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notice() {
  const { account } = useAccount();

  const role = String(account?.role || "").toLowerCase(); // "ADMIN" -> "admin"
  const canWriteNotice = role === "admin" || role === "planner";

  const router = useRouter();

  //  실제 로그인 유저 가져오기 (localStorage)
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("account"); // 로그인에서 저장한 키
      setUser(raw ? JSON.parse(raw) : null);
    } catch (e) {
      setUser(null);
    }
  }, []);

  console.log("account:", user, "role:", role);

  //  예시 데이터
  const notices = React.useMemo(() => {
    const pinned = Array.from({ length: 3 }).map((_, idx) => ({
      id: `pin-${idx + 1}`,
      pinned: true,
      title: `고정 공지사항 제목`,
      author: "관리자",
      date: "2026-01-23 09:00",
      views: 999,
      content:
        `이 글은 고정 공지사항입니다.\n\n` +
        `페이지가 넘어가도 항상 맨 위에 고정돼요. (${idx + 1})`,
    }));

    const normal = Array.from({ length: 37 }).map((_, idx) => ({
      id: `n-${idx + 1}`,
      pinned: false,
      title: `공지사항 제목 예시입니다.`,
      author: "관리자",
      date: "2026-01-23 10:10",
      views: 123 + idx,
      content:
        `공지사항 상세 내용 예시입니다.\n\n` +
        `- 항목 1\n- 항목 2\n\n` +
        `(${idx + 1})번째 글 내용입니다.`,
    }));

    return [...pinned, ...normal];
  }, []);

  //  모달
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  function openModal(n) {
    setSelected(n);
    setOpen(true);
  }
  function closeModal() {
    setOpen(false);
    setSelected(null);
  }

  //  정렬
  const [sort, setSort] = React.useState("latest"); // latest | views

  //  고정 / 일반 분리
  const pinnedNotices = notices.filter((n) => n.pinned).slice(0, 3);

  const normalNoticesSorted = React.useMemo(() => {
    const normal = notices.filter((n) => !n.pinned);
    const copy = [...normal];
    copy.sort((a, b) => {
      if (sort === "views") return (b.views || 0) - (a.views || 0);
      return String(b.date).localeCompare(String(a.date));
    });
    return copy;
  }, [notices, sort]);

  //  페이지네이션: 화면 총 10개 = pinned(3) + normal(7)
  const [page, setPage] = React.useState(1);

  const pageSize = 10;
  const pinnedCount = pinnedNotices.length; // 보통 3
  const normalPageSize = Math.max(1, pageSize - pinnedCount); //  0 방지

  const pageCount = Math.max(
    1,
    Math.ceil(normalNoticesSorted.length / normalPageSize),
  );
  const safePage = Math.min(Math.max(1, page), pageCount);

  const start = (safePage - 1) * normalPageSize;
  const pageRows = normalNoticesSorted.slice(start, start + normalPageSize);

  const total = pinnedNotices.length + normalNoticesSorted.length;

  React.useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function goPrev() {
    setPage((p) => Math.max(1, p - 1));
  }
  function goNext() {
    setPage((p) => Math.min(pageCount, p + 1));
  }

  function goWrite() {
    router.push("/notice-write");
  }
  function onSubmit() {
    alert("등록 완료!");
    router.push("/notice");
  }

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="공지사항">
      <div className="h-full w-full bg-white rounded-xl overflow-hidden">
        {/* 상단 헤더 */}
        <div className="px-10 py-6 border-neutral-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-neutral-600" />
              <h1 className="text-2xl font-semibold text-neutral-900">
                공지사항
              </h1>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              최신 공지/중요 공지를 확인하세요.
            </p>
          </div>
        </div>

        {/* 툴바 */}
        <div className="px-10 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="text-xs text-neutral-500">
              총 <span className="font-semibold text-neutral-700">{total}</span>
              건
            </div>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-7 px-3 rounded-md border border-neutral-200 bg-white text-[11px] outline-none"
            >
              <option value="latest">최신순</option>
              <option value="views">조회순</option>
            </select>
          </div>

          {/*  admin/planner만 */}
          {canWriteNotice && (
            <button
              type="button"
              onClick={goWrite}
              className="shrink-0 h-8 px-3 rounded-md bg-slate-900 text-white text-sm font-medium
                         hover:bg-slate-800 active:scale-[0.99] flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              공지 작성
            </button>
          )}
        </div>

        {/* 리스트 */}
        <div className="min-h-0">
          {/* 데스크탑 */}
          <div className="hidden md:block">
            <div className="px-10">
              {/* header */}
              <div className="grid grid-cols-[60px_1fr_110px_100px_90px] px-8 py-2 text-[12px] font-medium bg-neutral-200">
                <div className="text-center">번호</div>
                <div>제목</div>
                <div>작성자</div>
                <div>작성일</div>
                <div className="text-right pr-2">조회</div>
              </div>

              {/* pinned */}
              {pinnedNotices.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openModal(r)}
                  className="w-full text-left grid grid-cols-[60px_1fr_110px_100px_90px]
                             px-8 py-3 border-b border-neutral-100 hover:bg-neutral-100 transition cursor-pointer"
                >
                  <div className="flex items-center justify-center text-sm text-neutral-500">
                    <span className="text-amber-600 font-semibold">📌</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-[2px] rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                        <Pin className="w-3 h-3" />
                        고정
                      </span>
                      <span className="truncate text-sm text-neutral-900 font-medium">
                        {r.title}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-700 truncate">
                    {r.author}
                  </div>
                  <div className="text-xs text-neutral-500 truncate">
                    {r.date}
                  </div>
                  <div className="text-xs text-neutral-600 text-right pr-2">
                    {r.views}
                  </div>
                </button>
              ))}

              {/* normal */}
              {pageRows.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-neutral-500">
                  공지사항이 없습니다.
                </div>
              ) : (
                pageRows.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openModal(r)}
                    className="w-full text-left grid grid-cols-[60px_1fr_110px_100px_90px]
                               px-8 py-3 border-b border-neutral-100 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-center text-sm text-neutral-500">
                      {pinnedNotices.length + start + idx + 1}
                    </div>

                    <div className="min-w-0">
                      <span className="truncate text-sm text-neutral-900 font-medium block">
                        {r.title}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-700 truncate">
                      {r.author}
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {r.date}
                    </div>
                    <div className="text-xs text-neutral-600 text-right pr-2">
                      {r.views}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 모바일 */}
          <div className="md:hidden">
            <div className="p-4 space-y-3">
              {pinnedNotices.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openModal(r)}
                  className="w-full text-left rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-[2px] rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                          <Pin className="w-3 h-3" />
                          고정
                        </span>
                        <div className="text-sm font-semibold text-neutral-900 truncate">
                          {r.title}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-neutral-500 flex items-center gap-2">
                        <span className="text-neutral-700">{r.author}</span>
                        <span>•</span>
                        <span>{r.date}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-neutral-500 text-right">
                      {r.views}
                    </div>
                  </div>
                </button>
              ))}

              {pageRows.length === 0 ? (
                <div className="py-16 text-center text-sm text-neutral-500">
                  공지사항이 없습니다.
                </div>
              ) : (
                pageRows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openModal(r)}
                    className="w-full text-left rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-neutral-900 truncate">
                          {r.title}
                        </div>

                        <div className="mt-2 text-xs text-neutral-500 flex items-center gap-2">
                          <span className="text-neutral-700">{r.author}</span>
                          <span>•</span>
                          <span>{r.date}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs text-neutral-500 text-right">
                        {r.views}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 페이지네이션 */}
        <div className="px-10 py-3 border-neutral-200 flex items-center">
          <div className="ml-auto flex items-center gap-6">
            <div className="text-xs text-neutral-500">
              {safePage} / {pageCount} 페이지
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={safePage <= 1}
                className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[11px]
                         disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={safePage >= pageCount}
                className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[11px]
                         disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <NoticeModal open={open} onClose={closeModal} notice={selected} />
    </DashboardShell>
  );
}
