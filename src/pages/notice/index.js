// pages/notice/index.js
import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pin,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";
import { useAccount, useToken } from "@/stores/account-store";
import {
  getNotices,
  getNoticeById,
  setNoticePin,
  deleteNotice,
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

function normalizeFiles(n) {
  const raw =
    n?.attachments ||
    n?.files ||
    n?.attachedFiles ||
    n?.attachmentsList ||
    n?.fileList ||
    n?.existingFiles ||
    [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((f) => {
      if (!f) return null;
      if (typeof f === "string") {
        return { id: null, name: f.split("/").pop(), url: f };
      }
      return {
        id: f.id ?? f.fileId ?? f._id ?? null,
        name:
          f.name ??
          f.filename ??
          f.originalName ??
          f.fileName ??
          (f.url ? f.url.split("/").pop() : "파일"),
        url: f.url ?? f.path ?? f.fileUrl ?? f.downloadUrl ?? null,
      };
    })
    .filter(Boolean);
}

function normalizeRow(n) {
  return {
    ...n,
    id: getId(n),
    pinned: isPinned(n),
    files: normalizeFiles(n),
  };
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

  const normalizeFilesForModal = (n) => {
    const raw =
      n?.files ??
      n?.attachments ??
      n?.attachedFiles ??
      n?.attachmentsList ??
      n?.fileList ??
      n?.existingFiles ??
      [];
    if (!Array.isArray(raw)) return [];

    return raw
      .map((f) => {
        if (!f) return null;
        if (typeof f === "string") {
          return { id: null, name: f.split("/").pop(), url: f };
        }
        return {
          id: f.id ?? f.fileId ?? f._id ?? null,
          name:
            f.name ??
            f.filename ??
            f.originalName ??
            f.fileName ??
            (f.url ? f.url.split("/").pop() : "파일"),
          url: f.url ?? f.path ?? f.fileUrl ?? f.downloadUrl ?? null,
        };
      })
      .filter(Boolean);
  };

  const files = normalizeFilesForModal(notice);

  const isImage = (url) =>
    typeof url === "string" && /\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(url);

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
              <div className="text-2xl font-semibold leading-snug wrap-break-word pb-2">
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
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-7 wrap-break-word">
            {notice?.content || notice?.description || "내용이 없습니다."}
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="text-sm text-neutral-500 mb-2">첨부파일</div>
              <div className="grid grid-cols-1 gap-3">
                {files.map((f, idx) => {
                  const key = f.id ?? f.url ?? idx;
                  if (!f.url) {
                    return (
                      <div key={key} className="text-sm text-gray-600">
                        {f.name}
                      </div>
                    );
                  }
                  if (isImage(f.url)) {
                    return (
                      <a
                        key={key}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={f.url}
                          alt={f.name}
                          className="max-w-full rounded-md border"
                          style={{ maxHeight: 240 }}
                        />
                        <div className="text-xs text-neutral-500 mt-1">
                          {f.name}
                        </div>
                      </a>
                    );
                  }
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 underline truncate pr-4"
                      >
                        {f.name}
                      </a>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gray-500 hover:underline"
                        download
                      >
                        다운로드
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
  const [query, setQuery] = useState("");

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
    setNotices((prev) =>
      prev.map((n) =>
        n.id === row.id ? { ...n, views: (Number(getViews(n)) || 0) + 1 } : n,
      ),
    );

    setSelected(row);
    setOpen(true);

    if (row?.id == null) return;

    try {
      const detail = await getNoticeById(row.id, token);
      const item = detail?.notice || detail?.data || detail;
      const normalized = normalizeRow(item || {});

      const merged = {
        ...row,
        ...normalized,
        files:
          Array.isArray(normalized.files) && normalized.files.length > 0
            ? normalized.files
            : (row?.files ?? row?.attachments ?? []),
      };

      setSelected(merged);
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
      alert("현재 목록에 id가 없어서 핀 고정이 불가능합니다.");
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

  function onEdit(e, row) {
    e.stopPropagation();
    if (row?.id == null) {
      alert("id가 없어서 수정 페이지로 이동할 수 없습니다.");
      return;
    }
    router.push(`/notice-write?id=${row.id}`);
  }

  async function onDelete(e, row) {
    e.stopPropagation();
    if (row?.id == null) {
      alert("id가 없어서 삭제할 수 없습니다.");
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

  const GRID = "grid grid-cols-[80px_1fr_100px_120px_50px_120px]";

  const TABLE_WRAP =
    "w-full bg-white border-t-2 border-b-2 border-indigo-500 overflow-hidden";

  const ROW_BASE =
    "w-full text-left " +
    GRID +
    " px-6 h-12 items-center " +
    "border-b border-slate-100 " +
    "hover:bg-slate-50 transition cursor-pointer group";

  const ROW_PINNED = "bg-indigo-50/30";

  const CELL_TITLE =
    "min-w-0 truncate text-[14px] font-semibold text-slate-700 " +
    "group-hover:text-indigo-600 transition-colors";

  const CELL_TEXT = "truncate text-[12px] text-slate-700 whitespace-nowrap";
  const CELL_DATE = "truncate text-[12px] text-slate-600 whitespace-nowrap";

  // 조회(눈+숫자) 칸: 항상 같은 사이즈/정렬
  const VIEW_CELL =
    "flex items-center justify-start gap-1 pl-2 text-[12px] text-slate-700 whitespace-nowrap";

  // 관리(수정/삭제) 칸: 오른쪽 끝까지 붙이기
  const ACTION_CELL = "flex items-center justify-end gap-2 pr-2";

  const total = pinnedNotices.length + normalNotices.length;

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="공지사항">
      {/* */}
      <div className="h-full w-full overflow-hidden">
        <div className="px-10 py-6 border-neutral-200 flex items-center justify-between gap-4">
          {/* 왼쪽: 제목 */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Pin className="w-5 h-5 text-indigo-600" />
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                공지사항
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              최신 공지/중요 공지를 확인하세요.
            </p>
          </div>

          {/* 오른쪽: 검색창 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="제목 검색"
                className="
      h-9 w-[300px] rounded-md border border-slate-200
      pl-9 pr-3 text-sm
      outline-none
      transition
      focus:border-indigo-500
      focus:ring-2 focus:ring-indigo-100 placeholder:text-[12px]
    "
              />
            </div>
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
              className={`
    h-9 px-5 rounded-md border
    flex items-center gap-2 justify-center
    text-sm font-semibold
    transition-all duration-200
    focus:outline-none

    bg-indigo-600 text-white border-indigo-600
    hover:bg-indigo-500
    active:bg-indigo-700
    active:scale-[0.97]
    cursor-pointer
    shadow-sm
    focus:ring-2 focus:ring-indigo-200
  `}
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
            <div className={TABLE_WRAP}>
              {/* pinned */}
              {pinnedNotices.map((r, idx) => (
                <button
                  key={getRowKey(r, idx)}
                  type="button"
                  onClick={() => openModal(r)}
                  className={[ROW_BASE, ROW_PINNED].join(" ")}
                >
                  {/* 1) 번호/핀 */}
                  <div className="flex items-center justify-center">
                    {r.id != null ? (
                      <button
                        type="button"
                        onClick={(e) => onTogglePin(e, r)}
                        className="h-7 w-7 grid place-items-center"
                        title="상단 고정 해제"
                      >
                        📌
                      </button>
                    ) : null}
                  </div>

                  {/* 2) 제목 */}
                  <div className="min-w-0 pl-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        고정
                      </span>
                      <span className={CELL_TITLE}>{r.title}</span>
                    </div>
                  </div>

                  {/* 3) 작성자 */}
                  <div className={"pl-2 " + CELL_TEXT}>{getWriter(r)}</div>

                  {/* 4) 작성일 */}
                  <div className={"pl-2 " + CELL_DATE}>
                    {fmtDate(r.createdAt || r.date)}
                  </div>

                  {/* 5) 조회 */}
                  <div className={VIEW_CELL}>
                    <Eye className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="tabular-nums">{getViews(r)}</span>
                  </div>

                  {/* 6) 수정/삭제 */}
                  <div className={ACTION_CELL}>
                    {canWriteNotice ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => onEdit(e, r)}
                          className="h-8 w-8 grid place-items-center text-gray-400 hover:text-black"
                          title="수정"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onDelete(e, r)}
                          className="h-8 w-8 grid place-items-center text-gray-400 hover:text-red-600"
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
                <div className="px-6 py-14 text-center text-sm text-slate-500">
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
                    {/* 1) 번호 */}
                    <div className="flex items-center justify-center text-[13px] text-slate-500">
                      {pinnedNotices.length + start + idx + 1}
                    </div>

                    {/* 2) 제목 */}
                    <div className="min-w-0 pl-2">
                      <span className={CELL_TITLE}>{r.title}</span>
                    </div>

                    {/* 3) 작성자 */}
                    <div className={"pl-2 " + CELL_TEXT}>{getWriter(r)}</div>

                    {/* 4) 작성일 */}
                    <div className={"pl-2 " + CELL_DATE}>
                      {fmtDate(r.createdAt || r.date)}
                    </div>

                    {/* 5) 조회 */}
                    <div className={VIEW_CELL}>
                      <Eye className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="tabular-nums">{getViews(r)}</span>
                    </div>

                    {/* 6) 수정/삭제 */}
                    <div className={ACTION_CELL}>
                      {canWriteNotice ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => onEdit(e, r)}
                            className="h-8 w-8 grid place-items-center text-gray-400 hover:text-black"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => onDelete(e, r)}
                            className="h-8 w-8 grid place-items-center text-gray-400 hover:text-red-600"
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
            </div>

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
