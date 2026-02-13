// pages/board/index.js
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";
import { useAccount, useToken } from "@/stores/account-store";
import { getCommunities, deleteCommunity } from "@/api/community-api";

/* ===============================
   utils
=============================== */
function fmtDate(v) {
  if (!v) return "";
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

function getId(n) {
  if (!n) return null;
  return n.id ?? n.communityId ?? n.community_id ?? n._id ?? null;
}

function getRowKey(n, idx) {
  const id = getId(n);
  if (id != null) return `community-${id}`;
  return `community-x-${n?.createdAt ?? "noDate"}-${n?.title ?? "noTitle"}-${idx}`;
}

function getWriter(n) {
  return (
    n?.memberName ||
    n?.writer ||
    n?.author ||
    n?.name ||
    n?.member?.name ||
    n?.authorName ||
    n?.writerName ||
    "익명"
  );
}

// ✅ 글 작성자 id 추출(서버 응답 키가 제각각이라 방어)
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

/* ===============================
   page
=============================== */
export default function Board() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const role = String(account?.role || "").toLowerCase();
  const canWriteCommunity = role === "planner" || role === "worker";

  // ✅ 내 id
  const meId = account?.id != null ? String(account.id) : null;

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("latest"); // latest | comments
  const [data, setData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // styles
  const GRID = "grid grid-cols-[72px_1fr_120px_120px_90px_140px]";

  const TABLE_WRAP =
    "w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

  //
  const HEADER_ROW =
    GRID +
    " px-6 h-11 items-center " +
    "border-b border-slate-100 " +
    "text-[12px] font-semibold tracking-wide text-slate-500";

  const ROW_BASE =
    "w-full text-left " +
    GRID +
    " px-6 h-12 items-center " +
    "border-b border-slate-100 " +
    "hover:bg-slate-50 transition cursor-pointer group";

  //
  const CELL_TITLE =
    "min-w-0 truncate text-[14.5px] font-semibold text-slate-800 " +
    "group-hover:text-indigo-600 transition-colors";

  const CELL_TEXT = "truncate text-[12px] text-slate-700 whitespace-nowrap";
  const CELL_DATE = "truncate text-[12px] text-slate-600 whitespace-nowrap";

  //
  const COUNT_CELL =
    "text-right text-[12px] text-slate-700 whitespace-nowrap tabular-nums font-medium";

  const ACTION_CELL = "flex items-center justify-end gap-1";

  function goWrite() {
    router.push("/board-write");
  }

  function openPost(id) {
    if (id == null) return;
    router.push(`/board-view?id=${id}`);
  }

  async function loadList() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const json = await getCommunities(token);

      const list =
        json?.communities || json?.communityList || json?.items || json || [];
      const arr = Array.isArray(list) ? list : [];

      // ✅ 댓글 수는 comment-count API를 따로 치지 말고,
      //    getCommunities 응답에서 바로 뽑아쓰기
      const merged = arr.map((r) => {
        const cid = getId(r);

        const serverCnt =
          r.comments ??
          r.commentCount ??
          r.comment_count ??
          r.commentCnt ??
          r.comment_cnt ??
          r.replyCount ??
          r.reply_count ??
          0;

        return {
          ...r,
          id: cid != null ? String(cid) : null,
          __commentCount: Number(serverCnt) || 0,
        };
      });

      setData(merged);
      setPage(1);
    } catch (e) {
      console.error(e);
      setError(e?.message || "목록을 불러오지 못했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function onEdit(e, row) {
    e.preventDefault();
    e.stopPropagation();
    if (row?.id == null) return alert("id가 없어서 수정할 수 없습니다.");
    router.push(`/board-write?id=${row.id}`);
  }

  async function onDelete(e, row) {
    e.preventDefault();
    e.stopPropagation();
    if (row?.id == null) return alert("id가 없어서 삭제할 수 없습니다.");

    const ok = window.confirm("정말 삭제할까요?");
    if (!ok) return;

    try {
      await deleteCommunity(row.id, token);
      await loadList();
    } catch (err) {
      console.error("[DELETE API ERROR]", err);
      alert(err?.message || "삭제 실패");
    }
  }

  const q = safeLower(query).trim();

  const filtered = useMemo(() => {
    const mapped = (data || []).map((r) => {
      const id = r.id ?? getId(r);
      const title = r.title ?? "";
      const author = getWriter(r);
      const createdAt =
        r.createdAt ?? r.created_at ?? r.createdDate ?? r.createdDateTime ?? "";
      const comments =
        r.__commentCount ??
        r.comments ??
        r.commentCount ??
        r.comment_count ??
        r.commentCnt ??
        0;

      return {
        ...r,
        id: id != null ? String(id) : null,
        title,
        author,
        createdAt,
        comments: Number(comments) || 0,
        pinned: Boolean(r.pinned),
        __writerId: getWriterId(r),
      };
    });

    const arr = !q
      ? mapped
      : mapped.filter((r) => {
          const t = safeLower(r.title);
          const w = safeLower(r.author);
          return t.includes(q) || w.includes(q);
        });

    const pinned = arr.filter((r) => r.pinned);
    const normal = arr.filter((r) => !r.pinned);

    const sorter = (a, b) => {
      if (sort === "comments") return (b.comments || 0) - (a.comments || 0);
      const at = Date.parse(a.createdAt || "") || 0;
      const bt = Date.parse(b.createdAt || "") || 0;
      if (bt !== at) return bt - at;
      return String(b.id || "").localeCompare(String(a.id || ""));
    };

    pinned.sort(sorter);
    normal.sort(sorter);

    return { pinned, normal };
  }, [data, q, sort]);

  const pinnedRows = filtered.pinned || [];
  const normalRows = filtered.normal || [];
  const total = pinnedRows.length + normalRows.length;

  const hasMine = useMemo(() => {
    if (!meId) return false;
    const all = [...(pinnedRows || []), ...(normalRows || [])];
    return all.some(
      (r) => r?.__writerId && String(r.__writerId) === String(meId),
    );
  }, [meId, pinnedRows, normalRows]);

  const pinnedCount = pinnedRows.length;
  const normalPageSize = Math.max(1, pageSize - pinnedCount);

  const pageCount = Math.max(1, Math.ceil(normalRows.length / normalPageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * normalPageSize;
  const pageRows = normalRows.slice(start, start + normalPageSize);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function goPrev() {
    setPage((p) => Math.max(1, p - 1));
  }
  function goNext() {
    setPage((p) => Math.min(pageCount, p + 1));
  }

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="자유게시판">
      <div className="min-w-[1280px] h-full w-full overflow-x-auto px-5">
        {/* 상단 헤더 */}
        <div className="pt-4 pb-5">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="h-13 w-13 rounded-xl bg-indigo-600 grid place-items-center shadow-sm">
                      <MessageSquareText className="w-7 h-7 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-semibold tracking-tight text-slate-900">
                        자유게시판
                      </div>
                      <p className="mt-1 text-[12px] text-slate-500 font-medium">
                        업무 공유 / 질문 / 팁까지 편하게 올려주세요.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* 검색 */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="제목/내용 검색"
                      className="
                        h-10 w-[320px] rounded-xl border border-slate-200 bg-white
                        pl-9 pr-3 text-[13px]
                        outline-none transition
                        focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                        placeholder:text-[12px]
                      "
                    />
                  </div>

                  {/* 정렬 */}
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                    className="
                      h-10 px-3 rounded-xl border border-slate-200 bg-white
                      text-[12px] font-semibold text-slate-700 outline-none
                      focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                    "
                  >
                    <option value="latest">최신순</option>
                    <option value="comments">댓글순</option>
                  </select>

                  {/* 작성 버튼 */}
                  {canWriteCommunity && (
                    <button
                      type="button"
                      onClick={goWrite}
                      className="
                        h-10 px-4 rounded-xl
                        flex items-center gap-2 justify-center
                        text-[13px] font-semibold
                        bg-indigo-600 text-white
                        hover:bg-indigo-500 active:bg-indigo-700
                        active:scale-[0.98]
                        shadow-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-200
                        cursor-pointer
                      "
                    >
                      <Plus className="w-4 h-4" />
                      글쓰기
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 요약 라인 */}
            <div className="px-6 py-3 flex items-center justify-between">
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
              <div className={HEADER_ROW}>
                <div className="flex items-center justify-center">번호</div>
                <div className="pl-2">제목</div>
                <div className="pl-2">작성자</div>
                <div className="pl-2">작성일</div>
                <div className="text-right pr-2">댓글</div>
                <div className="text-right pr-7">{hasMine ? "관리" : "-"}</div>
              </div>

              {pageRows.length === 0 ? (
                <div className="px-6 py-14 text-center text-sm text-slate-500">
                  게시글이 없습니다.
                </div>
              ) : (
                pageRows.map((r, idx) => {
                  const isMinePost =
                    meId &&
                    r.__writerId &&
                    String(r.__writerId) === String(meId);

                  return (
                    <div
                      key={getRowKey(r, pinnedRows.length + start + idx)}
                      role="button"
                      tabIndex={0}
                      onClick={() => openPost(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openPost(r.id);
                      }}
                      className={ROW_BASE}
                    >
                      <div className="flex items-center justify-center text-[12px] font-medium text-slate-500 tabular-nums">
                        {pinnedRows.length + start + idx + 1}
                      </div>

                      <div className="min-w-0 pl-2">
                        <span className={CELL_TITLE}>{r.title}</span>
                      </div>

                      <div className={"pl-2 " + CELL_TEXT}>{r.author}</div>

                      <div className={"pl-2 " + CELL_DATE}>
                        {fmtDate(r.createdAt)}
                      </div>

                      <div className={COUNT_CELL}>{r.comments}</div>

                      <div className={ACTION_CELL}>
                        {canWriteCommunity && isMinePost ? (
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
                          <span className="text-xs text-slate-300" />
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
                  <span className="font-semibold text-slate-800 tabular-nums">
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
      </div>
    </DashboardShell>
  );
}
