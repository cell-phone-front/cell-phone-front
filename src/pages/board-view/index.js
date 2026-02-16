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

  if (typeof d === "string") {
    let s = d.trim();
    if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
    d = new Date(s);
  } else if (!(d instanceof Date)) {
    d = new Date(d);
  }

  if (!(d instanceof Date) || isNaN(d.getTime())) {
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

// 서버가 writer/author에 "id"를 내려주는 경우 화면에 잠깐 보이는 깜빡임 방지
function isIdLike(v) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  if (/^\d+$/.test(s)) return true;
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

// 작성자 id 뽑기 (글/댓글 공통 방어)
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

/**
 * ✅ memberId 방어 강화
 * - GET 목록 응답(SearchAllCommentResponse)에 memberId가 있어야 최종적으로 완벽합니다.
 */
function normalizeComment(raw, fallbackIdx = 0) {
  if (!raw) return null;

  const id = getId(raw);

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

  // ✅ 백에서 내려주는 익명 라벨
  const anonymous =
    raw.anonymous ?? raw.anonymousName ?? raw.anonymous_label ?? "";

  // ✅ memberId (키가 제각각일 수 있어 후보를 넓게)
  const memberId =
    raw.memberId ??
    raw.member_id ??
    raw.commentMemberId ??
    raw.comment_member_id ??
    raw.member?.id ??
    raw.member?.memberId ??
    raw.authorId ??
    raw.author_id ??
    raw.writerId ??
    raw.writer_id ??
    null;

  return {
    ...raw,
    id: id != null ? String(id) : `tmp-${fallbackIdx}-${Date.now()}`,
    content: String(content || ""),
    createdAt,
    anonymous: String(anonymous || ""),
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

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function TinyAvatar({ label = "익명" }) {
  const t = String(label || "익명").trim();
  const ch = t ? t.slice(0, 1) : "익";
  return (
    <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 grid place-items-center shrink-0">
      <span className="text-[11px] font-extrabold text-indigo-700">{ch}</span>
    </div>
  );
}

export default function BoardView() {
  const router = useRouter();

  // ✅ store 구조가 { account } / { token } 형태라고 가정하고 그대로 사용
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

  // ✅ 내 ID 추출 보강 (store/응답 키가 흔들려도 견딤)
  const meId = useMemo(() => {
    const v =
      account?.id ??
      account?.memberId ??
      account?.member_id ??
      account?._id ??
      null;
    return v != null ? String(v) : null;
  }, [account]);

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

      // ✅ (디버그) GET 응답에 memberId가 실제로 내려오는지 확인
      // console.log("GET comments raw sample:", list?.[0]);

      const normalized = list
        .map((c, idx) => normalizeComment(c, idx))
        .filter(Boolean);

      // ✅ 정렬 유지(최신순)
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

    const optimistic = {
      id: `local-${Date.now()}`,
      author: meName,
      content: t,
      createdAt: new Date().toISOString(),
      memberId: meId, // ✅ 내 id를 같이 넣어두면 즉시 아이콘 표시 가능
      anonymous: "", // 서버 응답 오면 교체
      __optimistic: true,
    };

    setNewComment("");
    setComments((prev) => [optimistic, ...(prev || [])]);

    try {
      // POST 응답에는 memberId/anonymous가 있음
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

  // 내 글인지 판별
  const postWriterId = useMemo(() => pickWriterId(post), [post]);
  const isMinePost = Boolean(
    meId && postWriterId && String(meId) === String(postWriterId),
  );

  // 익명 / 익명1 / 익명2 ... 라벨링 (정렬 순서 변경 없이 번호 부여)
  const anonLabelByMemberId = useMemo(() => {
    const map = new Map();

    const ownerId = postWriterId ? String(postWriterId) : null;
    if (ownerId) map.set(ownerId, "익명"); // 글 작성자 = 익명

    const sortedForLabel = [...(comments || [])].sort((a, b) => {
      const at = Date.parse(a.createdAt || "") || 0;
      const bt = Date.parse(b.createdAt || "") || 0;
      if (at !== bt) return at - bt; // 오래된 순
      return String(a.id).localeCompare(String(b.id));
    });

    let next = 1;
    for (const c of sortedForLabel) {
      const mid = c?.memberId != null ? String(c.memberId) : null;
      if (!mid) continue;

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
      <div className="px-4 pt-4 w-full min-w-0 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[1100px] h-[calc(100vh-120px)] flex flex-col gap-4 pb-6">
          {/* =========================
            1) 상단: 게시글 카드
           ========================= */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden shrink-0">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-start justify-between gap-4 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 grid place-items-center shadow-sm shrink-0">
                      <MessageSquareText className="w-6 h-6 text-indigo-600" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 truncate">
                          {title || "글 상세보기"}
                        </h1>
                        <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600">
                          상세
                        </span>
                        {isMinePost ? (
                          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                            내 글
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span className="text-slate-400">작성자</span>
                          <span className="font-semibold text-slate-700">
                            {writer}
                          </span>
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="inline-flex items-center gap-2">
                          <span className="text-slate-400">작성일</span>
                          <span className="tabular-nums">
                            {fmtDate(createdAt)}
                          </span>
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="inline-flex items-center gap-2">
                          <span className="text-slate-400">댓글</span>
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
                      h-9 px-4 rounded-xl border border-slate-200 bg-white
                      text-sm font-semibold text-slate-700
                      hover:bg-slate-50 active:bg-slate-100 transition
                      inline-flex items-center gap-2
                    "
                  >
                    <ArrowLeft className="h-4 w-4" />
                    목록
                  </button>

                  {canEditRole && isMinePost && (
                    <button
                      type="button"
                      onClick={onEditPost}
                      className="
                        h-9 px-4 rounded-xl
                        bg-indigo-600 text-white border border-indigo-600
                        hover:bg-indigo-700 active:bg-indigo-800 transition
                        inline-flex items-center gap-2
                        text-sm font-semibold shadow-sm
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
                  <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="break-words">{error}</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* 본문 */}
            <div className="px-6 py-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
                <div className="text-[15px] text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                  {content || (loading ? "" : "내용이 없습니다.")}
                </div>
              </div>
            </div>
          </div>

          {/* =========================
            2) 댓글 박스
           ========================= */}
          <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            {/* 댓글 헤더 */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 rounded-full bg-indigo-600" />
                  <div>
                    <div className="text-[12px] font-semibold text-slate-800">
                      댓글
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      의견을 남겨보세요.
                    </div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 tabular-nums">
                  {comments.length}개
                </span>
              </div>
            </div>

            {/* 댓글 목록 */}
            <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
              {commentLoading ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  댓글 불러오는 중...
                </div>
              ) : commentError ? (
                <div className="px-6 py-4">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="break-words">{commentError}</span>
                  </div>
                </div>
              ) : comments.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  댓글이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {comments.map((c, idx) => {
                    // 디버그
                    // console.log("meId:", meId, "comment.memberId:", c.memberId);

                    const isMine = Boolean(
                      meId && c.memberId && String(c.memberId) === String(meId),
                    );
                    const editing = editingId === c.id;

                    const displayAuthor =
                      (c.anonymous && String(c.anonymous).trim()) ||
                      (c.memberId &&
                        anonLabelByMemberId.get(String(c.memberId))) ||
                      "익명";

                    const canEditThis = canEditRole && isMine;

                    return (
                      <div key={`${c.id}-${idx}`} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <TinyAvatar label={displayAuthor} />

                          <div className="min-w-0 flex-1">
                            {!editing ? (
                              <div className="flex items-start gap-3">
                                {/* 왼쪽 */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="shrink-0 text-[12px] font-extrabold text-slate-800">
                                      {displayAuthor}
                                    </div>

                                    <div className="min-w-0 text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
                                      {String(c.content || "")}
                                      {c.__optimistic ? (
                                        <span className="ml-2 text-[11px] text-slate-400">
                                          (전송중)
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                {/* 오른쪽 */}
                                <div className="shrink-0 flex items-center gap-2">
                                  <div className="text-[11px] text-slate-400 tabular-nums">
                                    {fmtDate(c.createdAt)}
                                  </div>

                                  {canEditThis ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => startEditComment(c)}
                                        className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                                        title="댓글 수정"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeComment(c)}
                                        className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                        title="댓글 삭제"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* 수정 모드 */}
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-[12px] font-extrabold text-slate-800">
                                    {displayAuthor}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => saveEditComment(c)}
                                      className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-[12px] font-extrabold hover:bg-indigo-700 active:bg-indigo-800 transition"
                                    >
                                      저장
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditComment}
                                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-extrabold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>

                                <textarea
                                  value={editingValue}
                                  onChange={(e) =>
                                    setEditingValue(e.target.value)
                                  }
                                  className="
                                    mt-3 w-full min-h-[92px] resize-none
                                    border border-slate-200 bg-white
                                    px-3 py-2 text-[13px] text-slate-900
                                    outline-none transition
                                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                                  "
                                  placeholder="댓글 내용을 수정하세요"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 댓글 입력 */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-5">
              <div className="flex items-end gap-3">
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
                  rows={2}
                  className="
                    flex-1 min-w-0 min-h-[44px] max-h-[96px] resize-none
                    border border-slate-200 bg-slate-50
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
                  className={clsx(
                    "h-10 px-4 rounded-xl inline-flex items-center gap-2 text-[13px] font-extrabold transition shadow-sm shrink-0",
                    String(newComment || "").trim()
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed",
                  )}
                >
                  <Send className="w-4 h-4" />
                  등록
                </button>
              </div>

              <div className="h-10" />
            </div>
          </div>
          {/* /댓글 박스 */}
        </div>
      </div>
    </DashboardShell>
  );
}
