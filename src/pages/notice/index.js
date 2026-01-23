import React from "react";
import DashboardShell from "@/components/dashboard-shell";

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
        <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">
              {notice?.title || "공지사항"}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex gap-3">
              <span>작성일: {notice?.date || "-"}</span>
              <span>조회: {notice?.views ?? "-"}</span>
            </div>
          </div>
        </div>

        {/* 내용 */}
        <div className="px-5 py-4">
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-6">
            {notice?.content || "내용이 없습니다."}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="h-7 px-4 rounded-md bg-black text-white text-xs cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notice() {
  // ✅ pinned: true 인 3개는 상단 고정으로 처리할거야
  const notices = React.useMemo(() => {
    const pinned = Array.from({ length: 3 }).map((_, idx) => ({
      id: `pin-${idx + 1}`,
      pinned: true,
      title: `📌 고정 공지사항 제목 (${idx + 1})`,
      date: "2026-01-23",
      views: 999,
      content:
        `이 글은 고정 공지사항입니다.\n\n` +
        `페이지가 넘어가도 항상 맨 위에 고정돼요. (${idx + 1})`,
    }));

    const normal = Array.from({ length: 37 }).map((_, idx) => ({
      id: `n-${idx + 1}`,
      pinned: false,
      title: `공지사항 제목 예시입니다. (${idx + 1})`,
      date: "2026-01-23",
      views: 123,
      content:
        `공지사항 상세 내용 예시입니다.\n\n` +
        `- 항목 1\n- 항목 2\n\n` +
        `(${idx + 1})번째 글 내용입니다.`,
    }));

    return [...pinned, ...normal];
  }, []);

  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  const openModal = (notice) => {
    setSelected(notice);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelected(null);
  };

  // ✅ 1) 고정 / 일반 분리
  const pinnedNotices = notices.filter((n) => n.pinned).slice(0, 3);
  const normalNotices = notices.filter((n) => !n.pinned);

  // ✅ 2) 페이지네이션: 일반 글만 적용
  const pageSize = 8;
  const [page, setPage] = React.useState(1);

  const totalPages = Math.max(1, Math.ceil(normalNotices.length / pageSize));
  const start = (page - 1) * pageSize;
  const pagedNotices = normalNotices.slice(start, start + pageSize);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  //  고정글은 번호 대신 "📌" 표시, 일반글은 페이지 기준으로 역순 번호
  const getRowNo = (idxInPage) => normalNotices.length - (start + idxInPage);

  // 페이지가 데이터 줄어들면 범위 벗어나는 것 방지
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="공지사항">
      <div className="w-full h-full flex flex-col gap-4">
        {/* 상단 타이틀 */}
        <div className="bg-white rounded-xl px-10 py-5">
          <h1 className="text-xl font-bold">공지사항</h1>
          <p className="text-sm text-gray-500 mt-1">
            views 최신 공지사항을 확인할 수 있습니다.
          </p>
        </div>

        {/* 리스트 영역 */}
        <div className="bg-white rounded-xl overflow-hidden flex-1 flex flex-col">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[80px_1fr_140px_100px] bg-gray-100 border-b px-4 py-3 text-sm font-semibold text-gray-700">
            <div className="text-center">번호</div>
            <div>제목</div>
            <div className="text-center">작성일</div>
            <div className="text-center">조회</div>
          </div>

          {/* 테이블 바디 */}
          <div className="flex-1">
            {/* ✅ 상단 3개 고정 */}
            {pinnedNotices.map((n) => (
              <div
                key={n.id}
                className="grid grid-cols-[80px_1fr_140px_100px] px-4 py-3 border-b text-sm hover:text-blue-500 cursor-pointer"
                onClick={() => openModal(n)}
              >
                <div className="text-center text-orange-600 font-semibold">
                  📌
                </div>

                <div className="truncate font-medium decoration-gray-300">
                  {n.title}
                </div>

                <div className="text-center text-gray-500">{n.date}</div>
                <div className="text-center text-gray-500">{n.views}</div>
              </div>
            ))}

            {/* 일반 글 (페이지네이션 적용) */}
            {pagedNotices.map((n, idx) => (
              <div
                key={n.id}
                className="grid grid-cols-[80px_1fr_140px_100px] px-4 py-3 border-b text-sm hover:text-blue-500 cursor-pointer"
                onClick={() => openModal(n)}
              >
                <div className="text-center text-gray-600">{getRowNo(idx)}</div>

                <div className="truncate font-medium decoration-gray-300">
                  {n.title}
                </div>

                <div className="text-center text-gray-500">{n.date}</div>
                <div className="text-center text-gray-500">{n.views}</div>
              </div>
            ))}
          </div>

          {/* ✅ 페이지네이션 (일반글 기준) */}
          <div className="p-4 flex justify-center items-center gap-2">
            <button
              onClick={goPrev}
              disabled={page === 1}
              className="w-9 h-9 border rounded-md text-sm hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              {"<"}
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 border rounded-md text-sm hover:bg-gray-100 ${
                    pageNum === page ? "bg-black text-white border-black" : ""
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={goNext}
              disabled={page === totalPages}
              className="w-9 h-9 border rounded-md text-sm hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              {">"}
            </button>
          </div>
        </div>
      </div>

      {/* 모달 */}
      <NoticeModal open={open} onClose={closeModal} notice={selected} />
    </DashboardShell>
  );
}
