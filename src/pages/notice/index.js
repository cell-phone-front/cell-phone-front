import React from "react";
import { useRouter } from "next/router";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Pin,
} from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";
import { useAccount, useToken } from "@/stores/account-store";
import { getNotices, getNoticeById } from "@/api/notice-api";

function fmtDate(v) {
  if (!v) return "-";
  const s = String(v);

  let d = s;

  if (d.includes("T")) d = d.split("T")[0];
  else if (d.includes(" ")) d = d.split(" ")[0];
  else d = d.slice(0, 10);

  //  "-" → "."
  return d.replaceAll("-", ".");
}

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
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden p-4
               max-h-[85vh] flex flex-col"
        onClick={stop}
        role="dialog"
        aria-modal="true"
      >
        {/* 헤더 (sticky) */}
        <div className="sticky top-0 z-10 bg-white px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-2xl font-semibold leading-snug wrap-break-words pb-2">
                {notice?.title || "공지사항"}
              </div>

              <div className="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1 pb-1">
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">작성자</span>
                  <span className="text-gray-700">
                    {notice?.memberName ||
                      notice?.name ||
                      notice?.author ||
                      "-"}
                  </span>
                </span>

                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">작성일</span>
                  <span className="text-gray-700">
                    {fmtDate(notice?.createdAt || notice?.date)}
                  </span>
                </span>

                <span className="inline-flex items-center gap-1">
                  <Eye className="w-4 h-4 text-gray-300" />
                  <span className="text-gray-700">
                    {notice?.views ?? notice?.viewCount ?? "-"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 내용 (스크롤 영역) */}
        <div className="px-6 pt-1 pb-5 overflow-y-auto flex-1 min-h-0">
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-7 break-all wrap-break-words">
            {notice?.description || notice?.content || "내용이 없습니다."}
          </div>
        </div>

        {/* 푸터 (sticky) */}
        <div className="sticky bottom-0 bg-white px-6 py-4  flex justify-end gap-2">
          <button
            onClick={onClose}
            className="cursor-pointer h-8 px-4 rounded-md bg-gray-400 text-white text-xs
                   hover:bg-slate-900 active:scale-[0.99]"
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notice() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const role = String(account?.role || "").toLowerCase();
  const canWriteNotice = role === "admin" || role === "planner";

  // API로 받은 목록
  const [notices, setNotices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const json = await getNotices(token);

      // 백엔드 응답 키가 뭐든 흡수 (필요하면 여기만 맞추면 됨)
      const list =
        json?.notices || json?.noticeList || json?.data || json || [];
      setNotices(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setError("공지사항을 불러오지 못했습니다.");
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }

  // 첫 진입 시 목록 로드
  React.useEffect(() => {
    if (!token) return;
    loadList();
  }, [token]);

  // 모달
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  async function openModal(row) {
    setSelected(row);
    setOpen(true);

    //  상세 재조회 (내용/조회수 최신화)
    try {
      const id = row?.id ?? row?.noticeId;
      if (!id) return;
      const detail = await getNoticeById(id, token);
      const item = detail?.notice || detail?.data || detail;
      if (item) setSelected(item);
    } catch (e) {
      // 상세 실패해도 모달은 열어둠
    }
  }

  function closeModal() {
    setOpen(false);
    setSelected(null);
  }

  // 정렬
  const [sort, setSort] = React.useState("latest"); // latest | views

  // pinned / normal 분리 (서버 pinned 필드 가정)
  const pinnedNotices = React.useMemo(() => {
    return (notices || []).filter((n) => !!n.pinned).slice(0, 3);
  }, [notices]);

  const normalNoticesSorted = React.useMemo(() => {
    const normal = (notices || []).filter((n) => !n.pinned);
    const copy = [...normal];

    copy.sort((a, b) => {
      if (sort === "views")
        return (b.views || b.viewCount || 0) - (a.views || a.viewCount || 0);

      const bd = String(b.createdAt || b.date || "");
      const ad = String(a.createdAt || a.date || "");
      return bd.localeCompare(ad);
    });

    return copy;
  }, [notices, sort]);

  // 페이지네이션: 화면 총 10개 = pinned(최대3) + normal
  const [page, setPage] = React.useState(1);

  const pageSize = 10;
  const pinnedCount = pinnedNotices.length;
  const normalPageSize = Math.max(1, pageSize - pinnedCount);

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

        {/* 상태 */}
        {loading && (
          <div className="px-10 py-10 text-sm text-neutral-500">
            불러오는 중...
          </div>
        )}
        {!loading && error && (
          <div className="px-10 py-10 text-sm text-red-600">{error}</div>
        )}

        {/* 리스트 */}
        {!loading && !error && (
          <div className="min-h-0">
            <div className="hidden md:block">
              <div className="px-10">
                <div className="grid grid-cols-[60px_1fr_110px_140px_90px] px-8 py-2 text-[12px] font-medium bg-neutral-200">
                  <div className="text-center">번호</div>
                  <div>제목</div>
                  <div>작성자</div>
                  <div>작성일</div>
                  <div className="text-right pr-2">조회</div>
                </div>

                {/* pinned */}
                {pinnedNotices.map((r) => (
                  <button
                    key={r.id ?? r.noticeId}
                    type="button"
                    onClick={() => openModal(r)}
                    className="w-full text-left grid grid-cols-[60px_1fr_110px_140px_90px]
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
                      {r.memberName ||
                        r.name ||
                        r.author ||
                        r.writer ||
                        r.memberId ||
                        "-"}
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {fmtDate(r.createdAt || r.date)}
                    </div>

                    <div className="text-xs text-neutral-600 text-right pr-2">
                      {r.views ?? r.viewCount ?? "-"}
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
                      key={r.id ?? r.noticeId}
                      type="button"
                      onClick={() => openModal(r)}
                      className="w-full text-left grid grid-cols-[60px_1fr_110px_140px_90px]
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
                        {r.memberName ||
                          r.name ||
                          r.author ||
                          r.writer ||
                          r.memberId ||
                          "-"}
                      </div>
                      <div className="text-xs text-neutral-500 truncate">
                        {fmtDate(r.createdAt || r.date)}
                      </div>

                      <div className="text-xs text-neutral-600 text-right pr-2">
                        {r.views ?? r.viewCount ?? "-"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 모바일은 원래 너 코드 유지해도 되고, 동일하게 notices/pageRows로만 바꿔주면 됨 */}
          </div>
        )}

        {/* 페이지네이션 */}
        {!loading && !error && (
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
        )}
      </div>

      <NoticeModal open={open} onClose={closeModal} notice={selected} />
    </DashboardShell>
  );
}
