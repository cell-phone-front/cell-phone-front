// pages/board-write/index.js
import { useEffect, useState, useMemo } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useRouter } from "next/router";
import {
  getCommunityById,
  putCommunity,
  postCommunity,
} from "@/api/community-api";
import { useAccount, useToken } from "@/stores/account-store";

function canEdit(role) {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "planner";
}

export default function BoardWrite() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const role = useMemo(
    () => String(account?.role || "").toLowerCase(),
    [account],
  );
  const allowed = canEdit(role);

  const communityId = router.query?.id ? String(router.query.id) : null;
  const isEdit = Boolean(communityId);

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const authorName = useMemo(() => account?.name || "익명", [account]);

  useEffect(() => setHydrated(true), []);

  // 수정 모드일 때 기존 글 불러오기
  useEffect(() => {
    if (!hydrated || !token || !isEdit) return;

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
      } catch (e) {
        console.error(e);
        if (alive) setError(e?.message || "글 상세를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [hydrated, token, isEdit, communityId]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isEdit) {
        await putCommunity(communityId, { title, content }, token);
        alert("수정되었습니다.");
      } else {
        await postCommunity({ title, content }, token);
        alert("작성되었습니다.");
      }
      router.push("/board"); // 작성 후 목록으로
    } catch (e) {
      console.error(e);
      setError(e?.message || "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) return null;

  return (
    <DashboardShell
      crumbTop="자유게시판"
      crumbCurrent={isEdit ? "자유게시판 수정" : "자유게시판 작성"}
    >
      <div className="w-full h-full flex flex-col gap-4">
        <div className="bg-white rounded-xl px-10 py-5">
          <h1 className="text-xl font-bold">자유게시판</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? "자유게시판 내용을 확인/수정합니다."
              : "자유게시판 글 작성"}
          </p>
        </div>

        <div className="bg-white rounded-xl px-10 py-10 flex-1 flex flex-col gap-5">
          {loading ? (
            <div className="text-sm text-gray-500">불러오는 중...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : (
            <>
              {/* 제목 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  제목
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 px-3 border rounded-md text-sm outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              {/* 작성자 */}
              <div className="text-sm text-gray-500 mt-1">
                작성자: {authorName}
              </div>

              {/* 내용 */}
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-semibold text-gray-700">
                  내용
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-60 flex-1 px-3 py-3 border rounded-md text-sm outline-none focus:ring-2 focus:ring-black/20 resize-none"
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 mt-5">
                <button
                  className="px-4 py-2 border rounded-md"
                  onClick={() => router.push("/board")}
                >
                  목록으로
                </button>
                <button
                  className="px-4 py-2 bg-gray-800 text-white rounded-md"
                  onClick={handleSave}
                >
                  {isEdit ? "수정" : "작성"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
