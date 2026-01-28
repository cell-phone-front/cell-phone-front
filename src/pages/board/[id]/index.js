import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import DashboardShell from "@/components/dashboard-shell";
import { Pin, Clock, MessageSquareText, Trash2 } from "lucide-react";
import { useToken } from "@/stores/account-store";
import { getCommunityById } from "@/api/community-api";
import { getCommentAll, postComment, deleteComment } from "@/api/comment-api";

function normalizeComments(commentJson) {
  const candidates = [
    commentJson?.comments,
    commentJson?.commentList,
    commentJson?.items,
    commentJson?.data,
    commentJson?.result,
    commentJson?.list,
    commentJson?.content, // page 구조면 content가 배열일 수도
  ];

  for (const v of candidates) {
    if (Array.isArray(v)) return v;
  }
  if (Array.isArray(commentJson)) return commentJson;

  if (commentJson && typeof commentJson === "object") {
    for (const k of Object.keys(commentJson)) {
      if (Array.isArray(commentJson[k])) return commentJson[k];
    }
  }
  return [];
}

// ✅ "2026-01-28T15:52:28" / "2026-01-28 15:52:28" / "2026-01-28"
// -> "2026.1.28"
function formatDateDot(value) {
  if (!value) return "";

  const s = String(value);
  let datePart = s;

  if (s.includes("T")) datePart = s.split("T")[0];
  else if (s.includes(" ")) datePart = s.split(" ")[0];
  else datePart = s.slice(0, 10);

  // datePart: "YYYY-MM-DD"
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return datePart;

  return `${Number(y)}.${Number(m)}.${Number(d)}`;
}

export default function BoardDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useToken();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const communityId = useMemo(() => {
    if (id == null) return null;
    return String(id);
  }, [id]);

  async function reloadComments(cid) {
    const json = await getCommentAll(cid, token);
    const list = normalizeComments(json);
    const flat = Array.isArray(list[0]) ? list.flat() : list;
    setComments(Array.isArray(flat) ? flat : []);
  }

  useEffect(() => {
    if (!router.isReady) return;
    if (!communityId) return;

    let alive = true;
    setLoading(true);
    setError("");

    Promise.all([
      getCommunityById(communityId, token),
      getCommentAll(communityId, token),
    ])
      .then(([postJson, commentJson]) => {
        if (!alive) return;

        const p = postJson?.community || postJson?.data || postJson;
        setPost(p);

        const list = normalizeComments(commentJson);
        const flat = Array.isArray(list[0]) ? list.flat() : list;
        setComments(Array.isArray(flat) ? flat : []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "불러오기 실패");
        setPost(null);
        setComments([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [router.isReady, communityId, token]);

  function goList() {
    router.push("/board");
  }

  async function onAddComment() {
    const c = content.trim();
    if (!c) return;

    try {
      await postComment(communityId, c, token);
      setContent("");
      await reloadComments(communityId);
    } catch (e) {
      alert(e?.message || "댓글 작성 실패");
    }
  }

  async function onRemoveComment(commentId) {
    const ok = window.confirm("해당 댓글을 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await deleteComment(communityId, commentId, token);
      await reloadComments(communityId);
    } catch (e) {
      alert(e?.message || "댓글 삭제 실패");
    }
  }

  // ✅ 익명 번호: memberId(또는 작성자 식별값) 기준으로 익명 1/2/3...
  const anonMap = useMemo(() => {
    const map = new Map();
    let seq = 1;

    for (const c of comments) {
      const memberKey =
        c.memberId ??
        c.member_id ??
        c.member?.id ??
        c.author?.id ??
        c.writerId ??
        c.writer_id ??
        c.member?.memberId ??
        c.author?.memberId;

      if (memberKey == null) continue;

      const k = String(memberKey);
      if (!map.has(k)) {
        map.set(k, seq);
        seq += 1;
      }
    }
    return map;
  }, [comments]);

  function getDisplayAuthor(c) {
    const name =
      c.author?.name || c.member?.name || c.authorName || c.writerName || "";
    if (name) return name;

    const memberKey =
      c.memberId ??
      c.member_id ??
      c.member?.id ??
      c.author?.id ??
      c.writerId ??
      c.writer_id ??
      c.member?.memberId ??
      c.author?.memberId;

    if (memberKey == null) return "익명";

    const no = anonMap.get(String(memberKey));
    return no ? `익명 ${no}` : "익명";
  }

  if (!router.isReady) return null;

  if (loading) {
    return (
      <DashboardShell>
        <div className="bg-white rounded-xl p-10 text-sm text-neutral-500">
          불러오는 중...
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="bg-white rounded-xl p-10">
          <div className="text-sm text-red-500">{error}</div>
          <button
            type="button"
            onClick={goList}
            className="mt-4 h-9 px-4 border rounded-md text-sm hover:bg-gray-50"
          >
            목록으로
          </button>
        </div>
      </DashboardShell>
    );
  }

  if (!post) {
    return (
      <DashboardShell>
        <div className="bg-white rounded-xl p-10 text-sm text-neutral-500">
          해당 글이 없어요. (id: {String(id)})
        </div>
      </DashboardShell>
    );
  }

  const title = post.title || "(제목 없음)";
  const body = post.description || post.content || "(본문 없음)";
  const author =
    post.author?.name ||
    post.member?.name ||
    post.writerName ||
    post.authorName ||
    "익명";
  const createdAt = post.createdAt || post.created_at || "";
  const createdDate = formatDateDot(createdAt); // ✅ 점 날짜

  return (
    <DashboardShell>
      <div className="h-full w-full bg-white rounded-xl overflow-hidden flex flex-col">
        {/* header */}
        <div className="px-10 py-6 border-neutral-200 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {post.pinned && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                  <Pin className="w-3 h-3" />
                  고정
                </span>
              )}
              <h1 className="text-xl font-semibold text-neutral-900 truncate">
                {title}
              </h1>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
              <span className="text-gray-400">작성자</span>
              <span className="inline-flex items-center gap-1">{author}</span>
              <div></div>
              <span className="text-gray-400">작성일</span>
              <span className="inline-flex items-center gap-1">
                {createdDate}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={goList}
            className="h-9 px-4 border rounded-md text-sm hover:bg-gray-50"
          >
            목록
          </button>
        </div>

        {/* body */}
        <div className="px-10 py-6 min-h-0 flex flex-col">
          <div className="whitespace-pre-wrap text-sm text-neutral-700 leading-7">
            {body}
          </div>

          {/* comments */}
          <div className="mt-10 min-h-0 flex flex-col">
            <h2 className="text-sm font-semibold text-neutral-900 mb-2">
              댓글 <span className="text-neutral-500">({comments.length})</span>
            </h2>

            {/* write */}
            <div className="flex gap-2 items-start">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.shiftKey) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddComment();
                  }
                }}
                placeholder="댓글을 입력하세요 (Enter=등록 / Shift+Enter=줄바꿈)"
                rows={2}
                className="min-h-15 flex-1 px-3 py-2 rounded-md border border-neutral-200 text-sm outline-none placeholder:text-[12px] resize-none"
              />

              <button
                type="button"
                onClick={onAddComment}
                className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                등록
              </button>
            </div>

            {/* list: 스크롤 */}
            <div className="mt-4 min-h-0">
              <div className="divide-y divide-neutral-100 max-h-[45vh] overflow-y-auto pr-2">
                {comments.length === 0 ? (
                  <div className="py-10 text-center text-sm text-neutral-500">
                    첫 댓글을 남겨보세요.
                  </div>
                ) : (
                  comments
                    .slice()
                    .reverse()
                    .map((c, idx) => {
                      const commentId = c.id ?? c.commentId;
                      const cauthor = getDisplayAuthor(c);
                      const cdate = formatDateDot(c.createdAt || c.created_at); // ✅ 댓글도 점 날짜
                      const cbody = c.content || c.comment || "";

                      const key = `${String(commentId ?? "noid")}_${idx}`;

                      return (
                        <div key={key} className="py-3">
                          <div className="flex items-center justify-between gap-4">
                            {/* 작성자 / 댓글 / 날짜 */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="text-sm font-semibold text-neutral-900 shrink-0">
                                {cauthor}
                              </div>

                              <div className="text-sm text-neutral-700 min-w-0 flex-1 truncate">
                                {cbody}
                              </div>

                              <div className="text-xs text-neutral-500 shrink-0">
                                {cdate}
                              </div>
                            </div>

                            {commentId != null && (
                              <button
                                type="button"
                                onClick={() => onRemoveComment(commentId)}
                                className="shrink-0 h-8 w-8 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4 text-neutral-500 hover:text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
