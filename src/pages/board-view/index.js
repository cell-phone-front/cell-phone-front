// pages/board-view/index.js
import { useEffect, useState, useMemo } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useRouter } from "next/router";
import { getCommunityById } from "@/api/community-api";
import { useAccount, useToken } from "@/stores/account-store";

export default function BoardView() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const communityId = router.query?.id ? String(router.query.id) : null;
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const role = useMemo(
    () => String(account?.role || "").toLowerCase(),
    [account],
  );
  const canEdit = role === "planner" || role === "worker";

  useEffect(() => setHydrated(true), []);

  // 글 상세 불러오기
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

        setTitle(item?.title || "");
        setContent(item?.content || item?.description || "");
        setComments(item?.comments || []);
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

  const handleEdit = () => {
    if (!communityId) return;
    router.push(`/board-write?id=${communityId}`); // 수정 페이지 이동
  };

  const handleCommentSubmit = () => {
    if (!newComment.trim()) return;
    // TODO: 댓글 API 호출
    setComments([
      ...comments,
      { author: account?.name || "익명", content: newComment },
    ]);
    setNewComment("");
  };

  if (!hydrated) return null;

  return (
    <DashboardShell crumbTop="자유게시판" crumbCurrent="글 상세보기">
      <div className="w-full h-full flex flex-col gap-4">
        <div className="bg-white rounded-xl px-10 py-5">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            작성자: {account?.name || "익명"}
          </p>
        </div>

        <div className="bg-white rounded-xl px-10 py-10 flex-1 flex flex-col gap-5">
          {loading ? (
            <div className="text-sm text-gray-500">불러오는 중...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : (
            <>
              {/* 내용 읽기 전용 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  내용
                </label>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {content}
                </p>
              </div>

              {/* 권한 있으면 수정 버튼 */}
              {canEdit && (
                <button
                  className="px-4 py-2 bg-gray-800 text-white rounded-md"
                  onClick={handleEdit}
                >
                  수정
                </button>
              )}

              {/* 댓글 */}
              <div className="mt-5 flex flex-col gap-3">
                <h2 className="font-semibold text-gray-700">댓글</h2>
                {comments.length === 0 && (
                  <p className="text-sm text-gray-500">댓글이 없습니다.</p>
                )}
                {comments.map((c, idx) => (
                  <div key={idx} className="border-b border-gray-200 pb-2">
                    <p className="text-sm font-medium">{c.author}</p>
                    <p className="text-sm text-gray-700">{c.content}</p>
                  </div>
                ))}

                <div className="mt-3 flex gap-2">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글 작성"
                    className="flex-1 px-3 py-2 border rounded-md text-sm outline-none"
                  />
                  <button
                    onClick={handleCommentSubmit}
                    className="px-4 py-2 bg-gray-800 text-white rounded-md"
                  >
                    등록
                  </button>
                </div>
              </div>

              {/* 목록 */}
              <button
                className="mt-5 px-4 py-2 border rounded-md"
                onClick={() => router.push("/board")}
              >
                목록으로
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
