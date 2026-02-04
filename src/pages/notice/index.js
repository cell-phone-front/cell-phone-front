// pages/notice/index.js
import React from "react";
import { useRouter } from "next/router";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pin,
  Pencil,
  Trash2,
} from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";
import { useAccount, useToken } from "@/stores/account-store";
import {
  getNotices,
  getNoticeById,
  setNoticePin,
  deleteNotice, // ✅ 추가
} from "@/api/notice-api";

function fmtDate(v) {
  if (!v) return "-";
  const s = String(v);
  let d = s;
  if (d.includes("T")) d = d.split("T")[0];
  else if (d.includes(" ")) d = d.split(" ")[0];
  else d = d.slice(0, 10);
  return d.replaceAll("-", ".");
}

function isPinned(n) {
  const v =
    n?.pinned ??
    n?.isPinned ??
    n?.pin ??
    n?.fixed ??
    n?.top ??
    n?.pinnedYn ??
    n?.pinned_yn ??
    n?.noticePinned ??
    n?.notice_pinned;

  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "y" || s === "1" || s === "true";
  }
  return false;
}

function getId(n) {
  if (!n) return null;
  return (
    n.id ??
    n.noticeId ??
    n.notice_id ??
    n.noticeID ??
    n.noticeNo ??
    n.notice_no ??
    n._id ??
    null
  );
}

function getRowKey(n, idx) {
  const id = getId(n);
  if (id != null) return `notice-${id}`;
  return `notice-x-${n?.createdAt ?? "noDate"}-${n?.title ?? "noTitle"}-${idx}`;
}

function normalizeRow(n) {
  return { ...n, id: getId(n), pinned: isPinned(n) };
}

function getWriter(n) {
  return (
    n?.memberName ||
    n?.writer ||
    n?.author ||
    n?.name ||
    n?.member?.name ||
    n?.memberId ||
    n?.member_id ||
    n?.member?.id ||
    "-"
  );
}

function getViews(n) {
  const v =
    n?.views ??
    n?.viewCount ??
    n?.view ??
    n?.view_count ??
    n?.hit ??
    n?.hits ??
    n?.readCount ??
    n?.read_count;
  return v ?? "-";
}

function NoticeModal({ open, onClose, notice }) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === "Escape" && onClose();
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
        className="w-full max-w-2xl bg-white rounded-md shadow-xl overflow-hidden p-4 max-h-[85vh] flex flex-col"
        onClick={stop}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 bg-white px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-2xl font-semibold leading-snug break-words pb-2">
                {notice?.title || "공지사항"}
              </div>

              <div className="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1 pb-1">
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">작성자</span>
                  <span className="text-gray-700">{getWriter(notice)}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">작성일</span>
                  <span className="text-gray-700">
                    {fmtDate(notice?.createdAt || notice?.date)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-4 h-4 text-gray-300" />
                  <span className="text-gray-700">{getViews(notice)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pt-1 pb-5 overflow-y-auto flex-1 min-h-0">
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-7 break-words">
            {notice?.content || notice?.description || "내용이 없습니다."}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="cursor-pointer h-8 px-4 rounded-md bg-gray-400 text-white text-xs hover:bg-slate-900 active:scale-[0.99]"
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

  const [notices, setNotices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const json = await getNotices(token);
      const raw = Array.isArray(json?.noticeList) ? json.noticeList : [];
      const arr = raw.map(normalizeRow);
      setNotices(arr);
    } catch (e) {
      console.error(e);
      setError(e?.message || "공지사항을 불러오지 못했습니다.");
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!token) return;
    loadList();
  }, [token]);

  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  async function openModal(row) {
    // ✅ 리스트에서 조회수 먼저 +1
    setNotices((prev) =>
      prev.map((n) =>
        n.id === row.id ? { ...n, views: (getViews(n) || 0) + 1 } : n,
      ),
    );

    setSelected(row);
    setOpen(true);

    if (row?.id == null) return;

    try {
      const detail = await getNoticeById(row.id, token);
      const item = detail?.notice || detail?.data || detail;
      if (item) setSelected(normalizeRow(item));
    } catch (e) {
      console.error("[NOTICE DETAIL ERROR]", e);
    }
  }

  function closeModal() {
    setOpen(false);
    setSelected(null);
  }

  async function onTogglePin(e, row) {
    e.stopPropagation();

    if (row?.id == null) {
      alert(
        "현재 목록에 id가 없어서 핀 고정이 불가능해요. (백엔드에서 id 내려줘야 함)",
      );
      return;
    }

    const nextPinned = !Boolean(row.pinned);

    try {
      await setNoticePin(row.id, nextPinned, token);
      await loadList();
    } catch (err) {
      console.error("[PIN API ERROR]", err);
      alert(err?.message || "핀 토글 실패");
    }
  }

  // ✅ 수정
  function onEdit(e, row) {
    e.stopPropagation();
    if (row?.id == null) {
      alert("id가 없어서 수정 페이지로 이동할 수 없어요.");
      return;
    }
    // 추천: pages/notice/[id].js 만들어서 수정/상세 겸용
    router.push(`/notice-write?id=${row.id}`);

    // 만약 write 페이지로만 처리하고 싶으면:
    // router.push(`/notice-write?id=${row.id}`);
  }

  // ✅ 삭제
  async function onDelete(e, row) {
    e.stopPropagation();
    if (row?.id == null) {
      alert("id가 없어서 삭제할 수 없어요.");
      return;
    }

    const ok = window.confirm("정말 삭제할까요?");
    if (!ok) return;

    try {
      await deleteNotice(row.id, token);
      await loadList();
    } catch (err) {
      console.error("[DELETE API ERROR]", err);
      alert(err?.message || "삭제 실패");
    }
  }

  const pinnedNotices = React.useMemo(
    () =>
      (notices || [])
        .filter((n) => n.pinned)
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        ),
    [notices],
  );

  const normalNotices = React.useMemo(
    () =>
      (notices || [])
        .filter((n) => !n.pinned)
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        ),
    [notices],
  );

  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const pinnedCount = pinnedNotices.length;
  const normalPageSize = Math.max(1, pageSize - pinnedCount);

  const pageCount = Math.max(
    1,
    Math.ceil(normalNotices.length / normalPageSize),
  );
  const safePage = Math.min(Math.max(1, page), pageCount);

  const start = (safePage - 1) * normalPageSize;
  const pageRows = normalNotices.slice(start, start + normalPageSize);

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

  // ✅ 관리(수정/삭제) 컬럼 추가
  const GRID = "grid grid-cols-[80px_1fr_100px_110px_40px_130px]";
  const ROW_BASE =
    "w-full text-left " +
    GRID +
    " px-6 h-12 items-center border-b border-neutral-100 hover:bg-neutral-100 transition cursor-pointer";

  const total = pinnedNotices.length + normalNotices.length;

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="공지사항">
      <div className="h-full w-full bg-white rounded-xl overflow-hidden">
        <div className="px-10 py-6 border-neutral-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Pin className="w-5 h-5 text-neutral-600" />
              <h1 className="text-2xl font-semibold text-neutral-900">
                공지사항
              </h1>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              최신 공지/중요 공지를 확인하세요.
            </p>
          </div>
        </div>

        <div className="px-10 py-3 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            총 <span className="font-semibold text-neutral-700">{total}</span>건
          </div>

          {canWriteNotice && (
            <button
              type="button"
              onClick={goWrite}
              className="h-8 px-3 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              공지 작성
            </button>
          )}
        </div>

        {loading && (
          <div className="px-10 py-10 text-sm text-neutral-500">
            불러오는 중...
          </div>
        )}
        {!loading && error && (
          <div className="px-10 py-10 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && (
          <div className="px-10">
            <div
              className={
                GRID +
                " px-6 h-12 items-center bg-neutral-200 text-neutral-700 text-sm font-medium"
              }
            >
              <div className="text-center pr-2">번호</div>
              <div className="pl-2">제목</div>
              <div className="pl-2">작성자</div>
              <div className="pl-2">작성일</div>
              <div className="text-right pr-2">조회</div>
              <div className="text-center">수정 · 삭제</div>
            </div>

            {/* pinned */}
            {pinnedNotices.map((r, idx) => (
              <button
                key={getRowKey(r, idx)}
                type="button"
                onClick={() => openModal(r)}
                className={ROW_BASE}
              >
                <div className="flex items-center justify-center pr-2">
                  {r.id != null && (
                    <button
                      type="button"
                      onClick={(e) => onTogglePin(e, r)}
                      className="h-7 w-7 "
                      title="상단 고정 해제"
                    >
                      📌
                    </button>
                  )}
                </div>

                <div className="min-w-0 pl-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 inline-flex items-center text-[11px] font-semibold px-2 py-[2px] rounded-full bg-amber-100 text-amber-800">
                      고정
                    </span>

                    <span className="truncate text-sm text-neutral-900 font-medium">
                      {r.title}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-neutral-700 truncate pl-2">
                  {getWriter(r)}
                </div>
                <div className="text-sm text-neutral-500 truncate pl-2">
                  {fmtDate(r.createdAt || r.date)}
                </div>
                <div className="text-sm text-neutral-600 text-right pr-2">
                  {getViews(r)}
                </div>

                {/* ✅ 관리 */}
                <div className="flex items-center justify-center gap-2">
                  {canWriteNotice ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => onEdit(e, r)}
                        className="h-8 px-2  border-neutral-200 text-xs  text-gray-400 hover:text-black flex items-center cursor-pointer gap-1"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onDelete(e, r)}
                        className="h-8 px-2 text-xs text-gray-400 hover:text-red-600 flex items-center cursor-pointer gap-1"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-neutral-400">-</span>
                  )}
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
                  key={getRowKey(r, pinnedNotices.length + start + idx)}
                  type="button"
                  onClick={() => openModal(r)}
                  className={ROW_BASE}
                >
                  <div className="flex items-center justify-center text-sm text-neutral-500 pr-2">
                    {pinnedNotices.length + start + idx + 1}
                  </div>

                  <div className="min-w-0 pl-2">
                    <span className="truncate text-sm text-neutral-900 font-medium block">
                      {r.title}
                    </span>
                  </div>

                  <div className="text-sm text-neutral-700 truncate pl-2">
                    {getWriter(r)}
                  </div>
                  <div className="text-sm text-neutral-500 truncate pl-2">
                    {fmtDate(r.createdAt || r.date)}
                  </div>
                  <div className="text-sm text-neutral-600 text-right pr-2">
                    {getViews(r)}
                  </div>

                  {/* ✅ 관리 */}
                  <div className="flex items-center justify-center gap-2">
                    {canWriteNotice ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => onEdit(e, r)}
                          className="h-8 px-2  border-neutral-200 text-xs  text-gray-400 hover:text-black flex items-center cursor-pointer gap-1"
                          title="수정"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onDelete(e, r)}
                          className="h-8 px-2 text-xs text-gray-400 hover:text-red-600 flex items-center cursor-pointer gap-1"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-neutral-400">-</span>
                    )}
                  </div>
                </button>
              ))
            )}

            {/* 페이지네이션 */}
            <div className="py-3 flex items-center">
              <div className="ml-auto flex items-center gap-6">
                <div className="text-xs text-neutral-500">
                  {safePage} / {pageCount} 페이지
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={safePage <= 1}
                    className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[11px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={safePage >= pageCount}
                    className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[11px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                  >
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <NoticeModal open={open} onClose={closeModal} notice={selected} />
      </div>
    </DashboardShell>
  );
}
