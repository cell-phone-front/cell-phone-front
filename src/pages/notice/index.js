// pages/notice/index.js
import React, { useMemo, useState } from "react";
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
import NoticeModal from "@/components/notice/modal";

import { useAccount, useToken } from "@/stores/account-store";
import {
  getNotices,
  getNoticeById,
  setNoticePin,
  deleteNotice,
} from "@/api/notice-api";

/* ===============================
   utils
=============================== */
function fmtDate(v) {
  if (!v) return "-";
  const s = String(v);
  let d = s;
  if (d.includes("T")) d = d.split("T")[0];
  else if (d.includes(" ")) d = d.split(" ")[0];
  else d = d.slice(0, 10);
  return d.replaceAll("-", ".");
}

function safeLower(v) {
  return String(v ?? "").toLowerCase();
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
    n?.noticeAttachmentList ||
    n?.attachmentList ||
    n?.noticeAttachments ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((f) => {
      if (!f) return null;
      if (typeof f === "string")
        return { id: null, name: f.split("/").pop(), url: f };

      return {
        id:
          f.id ??
          f.noticeAttachmentId ??
          f.attachmentId ??
          f.fileId ??
          f._id ??
          null,
        name:
          f.name ??
          f.originalName ??
          f.filename ??
          f.fileName ??
          f.storedName ??
          (f.url ? f.url.split("/").pop() : "파일"),
        url: f.url ?? f.path ?? f.fileUrl ?? f.downloadUrl ?? null,
      };
    })
    .filter(Boolean);
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

// ✅ 공지 작성자 id 추출(서버 응답 키가 제각각이라 방어)
function getWriterId(n) {
  if (!n) return null;

  const v =
    n.memberId ??
    n.member_id ??
    n.writerId ??
    n.writer_id ??
    n.authorId ??
    n.author_id ??
    n.member?.id ??
    n.author?.id ??
    n.writer?.id ??
    null;

  return v != null ? String(v) : null;
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

/** ✅ 누락되면 normalizeRow is not defined 로 터집니다 */
function normalizeRow(n) {
  const id = getId(n);
  return {
    ...n,
    id: id != null ? String(id) : null,
    pinned: isPinned(n),
    files: normalizeFiles(n),
    __writerId: getWriterId(n), // ✅ 작성자 id 보관
  };
}

/* ===============================
   page
=============================== */
export default function Notice() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const role = String(account?.role || "").toLowerCase();
  // ✅ 공지는 admin/planner만 "관리 가능"이지만, 표시 자체는 "내 글"일 때만
  const canWriteNotice = role === "admin" || role === "planner";

  // ✅ 내 id
  const meId = account?.id != null ? String(account.id) : null;

  const [query, setQuery] = useState("");
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const json = await getNotices(token);
      const raw = Array.isArray(json?.noticeList) ? json.noticeList : [];
      setNotices(raw.map(normalizeRow));
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

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  async function openModal(row) {
    // 낙관적 조회수 +1
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
            : normalizeFiles(row || {}),
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
    e.preventDefault();
    e.stopPropagation();

    if (row?.id == null) {
      alert("현재 목록에 id가 없어서 핀 고정이 불가능합니다.");
      return;
    }

    const nextPinned = !Boolean(row.pinned);

    try {
      await setNoticePin(row.id, nextPinned, token);
      await loadList();
      setSelected((prev) =>
        prev?.id === row.id ? { ...prev, pinned: nextPinned } : prev,
      );
    } catch (err) {
      console.error("[PIN API ERROR]", err);
      alert(err?.message || "핀 토글 실패");
    }
  }

  function onEdit(e, row) {
    e.preventDefault();
    e.stopPropagation();
    if (row?.id == null) {
      alert("id가 없어서 수정 페이지로 이동할 수 없습니다.");
      return;
    }
    router.push(`/notice-write?id=${row.id}`);
  }

  async function onDelete(e, row) {
    e.preventDefault();
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
      if (selected?.id === row.id) closeModal();
    } catch (err) {
      console.error("[DELETE API ERROR]", err);
      alert(err?.message || "삭제 실패");
    }
  }

  function goWrite() {
    router.push("/notice-write");
  }

  // 검색(프론트 필터)
  const q = safeLower(query).trim();
  const filtered = useMemo(() => {
    if (!q) return notices || [];
    return (notices || []).filter((n) => {
      const t = safeLower(n?.title);
      const c = safeLower(n?.content ?? n?.description);
      const w = safeLower(getWriter(n));
      return t.includes(q) || c.includes(q) || w.includes(q);
    });
  }, [notices, q]);

  const pinnedNotices = useMemo(
    () =>
      (filtered || [])
        .filter((n) => n.pinned)
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        ),
    [filtered],
  );

  const normalNotices = useMemo(
    () =>
      (filtered || [])
        .filter((n) => !n.pinned)
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        ),
    [filtered],
  );

  // ✅ "내 공지"가 하나라도 있는지(헤더 '관리' vs '-')
  const hasMine = useMemo(() => {
    if (!meId) return false;
    const all = [...(pinnedNotices || []), ...(normalNotices || [])];
    return all.some(
      (r) => r?.__writerId && String(r.__writerId) === String(meId),
    );
  }, [meId, pinnedNotices, normalNotices]);

  // pagination (일반만 페이징)
  const [page, setPage] = useState(1);
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

  // styles
  const GRID = "grid grid-cols-[72px_1fr_120px_120px_78px_140px]";

  const TABLE_WRAP =
    "w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

  const HEADER_ROW =
    GRID +
    " px-6 h-11 items-center " +
    "border-b border-slate-100 " +
    "text-[11px] font-extrabold tracking-wide text-slate-500";

  const ROW_BASE =
    "w-full text-left " +
    GRID +
    " px-6 h-12 items-center " +
    "border-b border-slate-100 " +
    "hover:bg-slate-50 transition cursor-pointer group";

  const ROW_PINNED = "bg-indigo-50/40 hover:bg-indigo-50/70";

  const CELL_TITLE =
    "min-w-0 truncate text-[14px] font-bold text-slate-800 " +
    "group-hover:text-indigo-600 transition-colors";

  const CELL_TEXT = "truncate text-[12px] text-slate-700 whitespace-nowrap";
  const CELL_DATE = "truncate text-[12px] text-slate-600 whitespace-nowrap";

  const VIEW_CELL =
    "flex items-center justify-start gap-1 text-[12px] text-slate-700 whitespace-nowrap";

  const ACTION_CELL = "flex items-center justify-end gap-1";

  const total = pinnedNotices.length + normalNotices.length;

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="공지사항">
      <div className="h-full w-full overflow-hidden">
        {/* 상단 헤더 */}
        <div className="pt-4 pb-5">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="h-13 w-13 rounded-xl bg-indigo-600 grid place-items-center shadow-sm">
                      <Pin className="w-7 h-7 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-semibold tracking-tight text-slate-900">
                        공지사항
                      </div>
                      <p className="mt-1 text-[12px] text-slate-500 font-medium">
                        최신 공지/중요 공지를 확인하세요.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="제목/내용/작성자 검색"
                      className="
                        h-10 w-[320px] rounded-xl border border-slate-200 bg-white
                        pl-9 pr-3 text-[13px]
                        outline-none transition
                        focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                        placeholder:text-[12px]
                      "
                    />
                  </div>

                  {canWriteNotice && (
                    <button
                      type="button"
                      onClick={goWrite}
                      className="
                        h-10 px-4 rounded-xl
                        flex items-center gap-2 justify-center
                        text-[13px] font-extrabold
                        bg-indigo-600 text-white
                        hover:bg-indigo-500 active:bg-indigo-700
                        active:scale-[0.98]
                        shadow-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-200
                        cursor-pointer
                      "
                    >
                      <Plus className="w-4 h-4" />
                      공지 작성
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 요약 라인 */}
            <div className="px-6 py-2 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                총{" "}
                <span className="font-semibold text-slate-800 tabular-nums">
                  {total}
                </span>
                건
                {q ? (
                  <span className="ml-2 text-slate-400">
                    (검색:{" "}
                    <span className="text-slate-600 font-semibold">
                      {query}
                    </span>
                    )
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  고정{" "}
                  <span className="tabular-nums text-slate-800">
                    {pinnedNotices.length}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  일반{" "}
                  <span className="tabular-nums text-slate-800">
                    {normalNotices.length}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="px-10 py-10 text-sm text-slate-500">
            불러오는 중...
          </div>
        )}
        {!loading && error && (
          <div className="px-10 py-10 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && (
          <div className="pb-10">
            <div className={TABLE_WRAP}>
              {/* 컬럼 헤더 */}
              <div className={HEADER_ROW}>
                <div className="flex items-center justify-center">고정</div>
                <div className="pl-2">제목</div>
                <div className="pl-2">작성자</div>
                <div className="pl-2">작성일</div>
                <div>조회</div>
                <div className="text-right pr-7">{hasMine ? "관리" : "-"}</div>
              </div>

              {/* pinned */}
              {pinnedNotices.map((r, idx) => {
                const isMineNotice =
                  meId &&
                  r?.__writerId &&
                  String(r.__writerId) === String(meId);

                return (
                  <div
                    key={getRowKey(r, idx)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openModal(r)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openModal(r);
                    }}
                    className={[ROW_BASE, ROW_PINNED].join(" ")}
                  >
                    <div className="flex items-center justify-center">
                      {r.pinned ? (
                        canWriteNotice && r.id != null ? (
                          // ✅ admin/planner만 토글 가능
                          <button
                            type="button"
                            onClick={(e) => onTogglePin(e, r)}
                            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-indigo-100/70 transition"
                            title="상단 고정 해제"
                          >
                            📌
                          </button>
                        ) : (
                          // ✅ 권한 없으면 아이콘만 표시(클릭 불가)
                          <span
                            className="h-8 w-8 grid place-items-center text-indigo-600"
                            title="상단 고정"
                            aria-label="상단 고정"
                          >
                            📌
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </div>

                    <div className="min-w-0 pl-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 inline-flex items-center text-[11px] font-medium px-3 py-0.5 rounded-md bg-indigo-600 text-white">
                          고정
                        </span>
                        <span className={CELL_TITLE}>{r.title}</span>
                      </div>
                    </div>

                    <div className={"pl-2 " + CELL_TEXT}>{getWriter(r)}</div>

                    <div className={"pl-2 " + CELL_DATE}>
                      {fmtDate(r.createdAt || r.date)}
                    </div>

                    <div className={VIEW_CELL}>
                      <Eye className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="tabular-nums font-medium">
                        {getViews(r)}
                      </span>
                    </div>

                    <div className={ACTION_CELL}>
                      {canWriteNotice && isMineNotice ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => onEdit(e, r)}
                            className="h-9 w-9 grid place-items-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => onDelete(e, r)}
                            className="h-9 w-9 grid place-items-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* normal */}
              {pageRows.length === 0 ? (
                <div className="px-6 py-14 text-center text-sm text-slate-500">
                  공지사항이 없습니다.
                </div>
              ) : (
                pageRows.map((r, idx) => {
                  const isMineNotice =
                    meId &&
                    r?.__writerId &&
                    String(r.__writerId) === String(meId);

                  return (
                    <div
                      key={getRowKey(r, pinnedNotices.length + start + idx)}
                      role="button"
                      tabIndex={0}
                      onClick={() => openModal(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openModal(r);
                      }}
                      className={ROW_BASE}
                    >
                      <div className="flex items-center justify-center text-[13px] font-semibold text-slate-500 tabular-nums">
                        {pinnedNotices.length + start + idx + 1}
                      </div>

                      <div className="min-w-0 pl-2">
                        <span className={CELL_TITLE}>{r.title}</span>
                      </div>

                      <div className={"pl-2 " + CELL_TEXT}>{getWriter(r)}</div>

                      <div className={"pl-2 " + CELL_DATE}>
                        {fmtDate(r.createdAt || r.date)}
                      </div>

                      <div className={VIEW_CELL}>
                        <Eye className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="tabular-nums font-medium">
                          {getViews(r)}
                        </span>
                      </div>

                      <div className={ACTION_CELL}>
                        {canWriteNotice && isMineNotice ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => onEdit(e, r)}
                              className="h-9 w-9 grid place-items-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => onDelete(e, r)}
                              className="h-9 w-9 grid place-items-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 페이지네이션 */}
            <div className="mt-4 flex items-center">
              <div className="ml-auto flex items-center gap-3">
                <div className="text-xs text-slate-500">
                  <span className="font-extrabold text-slate-800 tabular-nums">
                    {safePage}
                  </span>{" "}
                  / <span className="tabular-nums">{pageCount}</span> 페이지
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={safePage <= 1}
                    className="
                      h-9 px-3 rounded-xl border border-slate-200 bg-white
                      text-[12px] font-semibold text-slate-700
                      disabled:opacity-50 disabled:cursor-not-allowed
                      hover:bg-slate-50
                      flex items-center gap-1 cursor-pointer
                    "
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={safePage >= pageCount}
                    className="
                      h-9 px-3 rounded-xl border border-slate-200 bg-white
                      text-[12px] font-semibold text-slate-700
                      disabled:opacity-50 disabled:cursor-not-allowed
                      hover:bg-slate-50
                      flex items-center gap-1 cursor-pointer
                    "
                  >
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <NoticeModal
          open={open}
          onClose={closeModal}
          notice={selected}
          token={token}
        />
      </div>
    </DashboardShell>
  );
}
