// pages/board-view/index.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useRouter } from "next/router";
import { getCommunityById } from "@/api/community-api";
import {
  getCommentAll,
  postComment,
  putComment,
  deleteComment,
} from "@/api/comment-api";
import { useAccount, useToken } from "@/stores/account-store";
import {
  MessageSquareText,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertTriangle,
  Send,
} from "lucide-react";

/* ===============================
   utils
=============================== */
function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtDate(v) {
  if (!v) return "";

  let d = v;

  // 문자열이면 Date로 파싱되기 쉬운 형태로 정리
  if (typeof d === "string") {
    let s = d.trim();
    // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
    if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
    d = new Date(s);
  } else if (!(d instanceof Date)) {
    d = new Date(d);
  }

  if (!(d instanceof Date) || isNaN(d.getTime())) {
    // 파싱 실패 시 최소 방어(원래 하던 날짜만)
    const s = String(v);
    let only = s;
    if (only.includes("T")) only = only.split("T")[0];
    else if (only.includes(" ")) only = only.split(" ")[0];
    else only = only.slice(0, 10);
    return only.replaceAll("-", ".");
  }

  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());

  return `${y}.${m}.${day} ${hh}:${mm}`;
}

// ✅ 서버가 writer/author에 "id"를 내려주는 경우 화면에 잠깐 보이는 깜빡임 방지
function isIdLike(v) {
  const s = String(v ?? "").trim();
  if (!s) return false;

  // 숫자만(1, 23) -> ID로 간주
  if (/^\d+$/.test(s)) return true;

  // uuid 형태 -> ID로 간주
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s))
    return true;

  return false;
}

function pickWriter(item, fallback = "익명") {
  return (
    item?.memberName ||
    item?.writer ||
    item?.author ||
    item?.name ||
    item?.member?.name ||
    item?.authorName ||
    item?.writerName ||
    fallback
  );
}

// ✅ 작성자 id 뽑기 (글/댓글 공통 방어)
function pickWriterId(item) {
  if (!item) return null;
  const v =
    item.memberId ??
    item.member_id ??
    item.writerId ??
    item.writer_id ??
    item.authorId ??
    item.author_id ??
    item.member?.id ??
    item.author?.id ??
    item.writer?.id ??
    null;
  return v != null ? String(v) : null;
}

function getId(v) {
  if (v == null) return null;
  return v.id ?? v.commentId ?? v.comment_id ?? v._id ?? null;
}

function normalizeComment(raw, fallbackIdx = 0) {
  if (!raw) return null;

  const id = getId(raw);

  // ✅ 서버가 author/writer에 id를 내려주는 경우가 있어서 필터링
  //    (익명/익명1 라벨링은 렌더링 단계에서 처리)
  const picked = pickWriter(raw, "");
  const author = !picked || isIdLike(picked) ? "" : String(picked);

  const content =
    raw.content ??
    raw.comment ??
    raw.message ??
    raw.description ??
    raw.text ??
    "";

  const createdAt =
    raw.createdAt ??
    raw.created_at ??
    raw.createdDate ??
    raw.createdDateTime ??
    raw.date ??
    null;

  const memberId =
    raw.memberId ?? raw.member_id ?? raw.member?.id ?? raw.authorId ?? null;

  return {
    ...raw,
    id: id != null ? String(id) : `tmp-${fallbackIdx}-${Date.now()}`,
    author, // ✅ 여기서 "익명"을 넣지 않음(라벨링에서 처리)
    content: String(content || ""),
    createdAt,
    memberId: memberId != null ? String(memberId) : null,
  };
}

function extractCommentList(apiJson) {
  const base =
    apiJson?.comments ||
    apiJson?.commentList ||
    apiJson?.items ||
    apiJson?.data ||
    apiJson;

  return Array.isArray(base) ? base : [];
}

export default function BoardView() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const communityId = router.query?.id ? String(router.query.id) : null;

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [post, setPost] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 댓글
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [comments, setComments] = useState([]);

  const [newComment, setNewComment] = useState("");

  // 댓글 수정 UI 상태
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const role = useMemo(
    () => String(account?.role || "").toLowerCase(),
    [account],
  );

  // 게시판 정책 유지(작성 가능한 롤)
  const canEditRole = role === "planner" || role === "worker";

  const meName = account?.name ? String(account.name) : "익명";
  const meId = account?.id != null ? String(account.id) : null;

  function onBack() {
    router.push("/board");
  }

  function onEditPost() {
    if (!communityId) return;
    router.push(`/board-write?id=${communityId}`);
  }

  async function loadComments() {
    if (!token || !communityId) return;

    setCommentLoading(true);
    setCommentError("");

    try {
      const json = await getCommentAll(communityId, token);
      const list = extractCommentList(json);
      const normalized = list
        .map((c, idx) => normalizeComment(c, idx))
        .filter(Boolean);

      // ✅ 기존 정렬 그대로 유지(요구사항: 정렬 건드리지 마)
      normalized.sort((a, b) => {
        const at = Date.parse(a.createdAt || "") || 0;
        const bt = Date.parse(b.createdAt || "") || 0;
        if (bt !== at) return bt - at;
        return String(b.id).localeCompare(String(a.id));
      });

      setComments(normalized);
    } catch (e) {
      console.error(e);
      setCommentError(e?.message || "댓글을 불러오지 못했습니다.");
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  }

  // 글 상세
  useEffect(() => {
    if (!hydrated || !token || !communityId) return;

    let alive = true;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const detail = await getCommunityById(communityId, token);
        const item = detail?.board || detail?.data || detail;

        if (!alive) return;

        setPost(item || null);
        setTitle(String(item?.title || ""));
        setContent(String(item?.content || item?.description || ""));
      } catch (e) {
        console.error(e);
        if (alive) setError(e?.message || "글을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [hydrated, token, communityId]);

  // 댓글 조회
  useEffect(() => {
    if (!hydrated || !token || !communityId) return;
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token, communityId]);

  async function onSubmitComment() {
    const t = String(newComment || "").trim();
    if (!t) return;
    if (!token || !communityId) return;

    // ✅ optimistic에선 내 이름 표시(여긴 깜빡일 수 없게 normalize 단계에서 id-like 방지)
    const optimistic = {
      id: `local-${Date.now()}`,
      author: meName,
      content: t,
      createdAt: new Date().toISOString(),
      memberId: meId,
      __optimistic: true,
    };

    setNewComment("");
    setComments((prev) => [optimistic, ...(prev || [])]);

    try {
      await postComment(communityId, t, token);
      await loadComments();
    } catch (e) {
      console.error(e);
      setComments((prev) => (prev || []).filter((c) => c.id !== optimistic.id));
      alert(e?.message || "댓글 등록 실패");
    }
  }

  function startEditComment(c) {
    setEditingId(c.id);
    setEditingValue(String(c.content || ""));
  }

  function cancelEditComment() {
    setEditingId(null);
    setEditingValue("");
  }

  async function saveEditComment(c) {
    const next = String(editingValue || "").trim();
    if (!next) return alert("내용을 입력해주세요.");
    if (!token || !communityId) return;

    try {
      await putComment(communityId, c.id, next, token);
      cancelEditComment();
      await loadComments();
    } catch (e) {
      console.error(e);
      alert(e?.message || "댓글 수정 실패");
    }
  }

  async function removeComment(c) {
    if (!token || !communityId) return;

    const ok = window.confirm("댓글을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteComment(communityId, c.id, token);
      await loadComments();
    } catch (e) {
      console.error(e);
      alert(e?.message || "댓글 삭제 실패");
    }
  }

  // 작성자 표시(게시글)
  const writerRaw = useMemo(() => pickWriter(post, "익명"), [post]);
  const writer = useMemo(
    () => (isIdLike(writerRaw) ? "익명" : writerRaw),
    [writerRaw],
  );

  const createdAt =
    post?.createdAt ??
    post?.created_at ??
    post?.createdDate ??
    post?.createdDateTime ??
    null;

  //  내 글인지 판별(이게 핵심)
  const postWriterId = useMemo(() => pickWriterId(post), [post]);
  const isMinePost = Boolean(
    meId && postWriterId && String(meId) === String(postWriterId),
  );

  // ✅ 익명 / 익명1 / 익명2 ... 라벨링 (정렬 순서 변경 없이 현재 comments 순서대로 번호 부여)
  const anonLabelByMemberId = useMemo(() => {
    const map = new Map();

    const ownerId = postWriterId ? String(postWriterId) : null;
    if (ownerId) map.set(ownerId, "익명"); // 글 작성자 = 익명

    // ✅ 번호 부여는 "오래된 댓글부터" (표시 정렬은 건드리지 않음)
    const sortedForLabel = [...(comments || [])].sort((a, b) => {
      const at = Date.parse(a.createdAt || "") || 0;
      const bt = Date.parse(b.createdAt || "") || 0;
      if (at !== bt) return at - bt; // 오래된 순
      return String(a.id).localeCompare(String(b.id));
    });

    let next = 1;

    for (const c of sortedForLabel) {
      const mid = c?.memberId ? String(c.memberId) : null;
      if (!mid) continue;

      // 이름이 있으면 번호 필요 없음
      if (c.author && String(c.author).trim()) continue;

      // 글 작성자는 "익명"
      if (ownerId && mid === ownerId) continue;

      if (!map.has(mid)) {
        map.set(mid, `익명${next}`);
        next += 1;
      }
    }

    return map;
  }, [comments, postWriterId]);

  if (!hydrated) return null;

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="글 상세보기">
      <div className="w-full min-h-[calc(100vh-120px)] overflow-x-hidden">
        <div className="w-full py-5 min-w-0">
          {/* 상단 헤더 카드 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full min-w-0">
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-13 w-13 rounded-xl bg-indigo-100 grid place-items-center shadow-sm shrink-0">
                      <MessageSquareText className="w-7 h-7 text-indigo-600" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 truncate">
                          {title || "글 상세보기"}
                        </h1>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 font-medium">
                        <span>
                          작성자:{" "}
                          <span className="font-semibold text-slate-700">
                            {writer}
                          </span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>작성일: {fmtDate(createdAt)}</span>
                        <span className="text-slate-300">•</span>
                        <span>
                          댓글{" "}
                          <span className="font-semibold text-slate-700 tabular-nums">
                            {comments.length}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onBack}
                    className="
                      h-9 px-4 rounded-lg border border-slate-200 bg-white
                      text-sm font-semibold text-slate-700
                      hover:bg-slate-50 active:bg-slate-100 transition
                      inline-flex items-center gap-2
                    "
                  >
                    <ArrowLeft className="h-4 w-4" />
                    목록
                  </button>

                  {/* ✅ 내 글만 수정 버튼 */}
                  {canEditRole && isMinePost && (
                    <button
                      type="button"
                      onClick={onEditPost}
                      className="
                        h-9 px-4 rounded-lg
                        bg-indigo-600 text-white border border-indigo-600
                        hover:bg-indigo-700 active:bg-indigo-800 transition
                        inline-flex items-center gap-2
                        text-sm font-semibold
                      "
                      title="수정"
                    >
                      <Pencil className="h-4 w-4" />
                      수정
                    </button>
                  )}
                </div>
              </div>
            </div>

            {(loading || error) && (
              <div className="px-6 py-4">
                {loading ? (
                  <div className="text-sm text-slate-500">불러오는 중...</div>
                ) : null}
                {error ? (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="break-words">{error}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* 본문 + 댓글 2단 */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[5fr_5fr] gap-5 min-w-0">
            {/* 본문 카드 */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-0">
              <div className="px-6 py-4 border-slate-100 flex justify-between items-center">
                <div className="text-[12px] font-black text-slate-700">
                  내용
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  수정은 본인이 작성한 글만 가능합니다.
                </div>
              </div>

              <div className="px-6 py-5">
                <div
                  className="
                    rounded-xl border border-slate-200 bg-slate-50
                    px-4 py-4
                    text-[15px] text-slate-800
                    whitespace-pre-wrap
                    leading-relaxed
                    h-[350px]
                  "
                >
                  {content || (loading ? "" : "내용이 없습니다.")}
                </div>
              </div>
            </div>

            {/* 댓글 카드 */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-0">
              <div className="px-6 py-4 border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-black text-slate-700">
                    댓글
                  </div>
                  <div className="text-[11px] font-black text-slate-400 tabular-nums">
                    {comments.length}개
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <div
                  className="
                    rounded-xl border border-slate-200 bg-slate-50
                    max-h-[360px] overflow-y-auto
                    p-3 space-y-2
                  "
                >
                  {commentLoading ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                      댓글 불러오는 중...
                    </div>
                  ) : commentError ? (
                    <div className="px-3 py-3 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="break-words">{commentError}</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                      댓글이 없습니다.
                    </div>
                  ) : (
                    comments.map((c, idx) => {
                      const isMine = Boolean(
                        meId &&
                        c.memberId &&
                        String(c.memberId) === String(meId),
                      );

                      const editing = editingId === c.id;

                      const displayAuthor =
                        (c.author && String(c.author).trim()) ||
                        (c.memberId &&
                          anonLabelByMemberId.get(String(c.memberId))) ||
                        "익명";

                      return (
                        <div
                          key={`${c.id}-${idx}`}
                          className={[
                            "rounded-lg bg-white border px-4 py-4",
                            isMine
                              ? "border-indigo-200 bg-indigo-50/40"
                              : "border-slate-200",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {/* 왼쪽: 작성자/배지 */}
                            <div className="min-w-0 flex items-center gap-2">
                              <div
                                className="
        h-7 min-w-0 flex items-center
        text-[12px] font-bold text-slate-800 truncate
      "
                                title={displayAuthor}
                              >
                                {displayAuthor}
                              </div>

                              {isMine ? (
                                <span
                                  className="
          h-7 inline-flex items-center
          text-[10px] font-extrabold
          px-2 rounded-full
          bg-indigo-100 text-indigo-700
          border border-indigo-200
          shrink-0
        "
                                >
                                  내 댓글
                                </span>
                              ) : null}
                            </div>

                            {/* 오른쪽: 날짜 + 액션 */}
                            <div className="flex items-center gap-2 shrink-0">
                              {c.createdAt ? (
                                <div
                                  className="
          h-7 inline-flex items-center
          text-[11px] text-slate-400 tabular-nums
          px-1
        "
                                >
                                  {fmtDate(c.createdAt)}
                                </div>
                              ) : null}

                              {canEditRole &&
                              isMine &&
                              c.id &&
                              !String(c.id).startsWith("local-") ? (
                                <div className="flex items-center gap-1">
                                  {editing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => saveEditComment(c)}
                                        className="
                h-7 px-3 rounded-lg
                bg-indigo-600 text-white
                text-[12px] font-bold
                hover:bg-indigo-700 active:bg-indigo-800 transition
              "
                                      >
                                        저장
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEditComment}
                                        className="
                h-7 px-3 rounded-lg
                border border-slate-200 bg-white
                text-[12px] font-bold text-slate-700
                hover:bg-slate-50 active:bg-slate-100 transition
              "
                                      >
                                        취소
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEditComment(c)}
                                        className="
                h-7 w-7 grid place-items-center
                rounded-lg
                text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition
              "
                                        title="댓글 수정"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeComment(c)}
                                        className="
                h-7 w-7 grid place-items-center
                rounded-lg
                text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition
              "
                                        title="댓글 삭제"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-2">
                            {editing ? (
                              <textarea
                                value={editingValue}
                                onChange={(e) =>
                                  setEditingValue(e.target.value)
                                }
                                className="
                                  w-full min-h-[72px] resize-none
                                  rounded-xl border border-slate-200 bg-white
                                  px-3 py-2 text-[12px] text-slate-900
                                  outline-none transition
                                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                                "
                                placeholder="댓글 내용을 수정하세요"
                              />
                            ) : (
                              <div className="text-[14px] text-slate-700 whitespace-pre-wrap">
                                {String(c.content || "")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 입력 */}
                <div className="mt-3 flex items-start gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSubmitComment();
                      }
                    }}
                    placeholder="댓글을 입력하세요 (Shift+Enter 줄바꿈)"
                    rows={3}
                    className="
                      min-h-[40px] max-h-[120px] resize-none
                      flex-1 rounded-xl border border-slate-200 bg-white
                      px-3 py-2 text-[13px] text-slate-900
                      outline-none transition
                      focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                      placeholder:text-slate-400
                    "
                  />
                  <button
                    type="button"
                    onClick={onSubmitComment}
                    disabled={!String(newComment || "").trim()}
                    className={[
                      "h-10 px-4 rounded-xl inline-flex items-center gap-2 text-[13px] font-extrabold transition shrink-0",
                      String(newComment || "").trim()
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed",
                    ].join(" ")}
                  >
                    <Send className="w-4 h-4" />
                    등록
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  Enter로 등록, Shift+Enter로 줄바꿈됩니다.
                </div>
              </div>
            </div>
          </div>

          <div className="h-8" />
        </div>
      </div>
    </DashboardShell>
  );
}
