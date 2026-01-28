import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Send } from "lucide-react";
import { useAccount, useToken } from "@/stores/account-store";
import DashboardShell from "@/components/dashboard-shell";
import { postCommunity } from "@/api/community-api";

export default function BoardWrite() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  // persist 복구 기다리는 용도
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const authorName = useMemo(() => account?.name || "익명", [account]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ✅ hydrated 된 다음에만 로그인 체크
  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace("/login");
  }, [hydrated, token, router]);

  // ✅ 복구중이면 화면 안그림
  if (!hydrated) return null;

  // ✅ 복구 끝났는데 token 없으면 화면 안그림
  if (!token) return null;

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  function goList() {
    router.replace("/board"); // 필요하면 이렇게
  }

  function onCancel() {
    if (title.trim() || content.trim()) {
      const ok = window.confirm("작성 중인 내용이 사라집니다. 취소할까요?");
      if (!ok) return;
    }
    goList();
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const t = title.trim();
    const c = content.trim();

    if (!t) return setError("제목을 입력해주세요.");
    if (!c) return setError("내용을 입력해주세요.");

    setSaving(true);

    try {
      // content -> description 으로 보내기 (백엔드 스펙)
      const payload = { title: t, description: c };

      const data = await postCommunity(payload, token);

      // 서버가 id를 내려주면 상세로 보내고 싶을 때(옵션)
      // if (data?.id) return router.replace(`/board/${data.id}`);

      goList();
    } catch (err) {
      setError(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="자유게시판 작성">
      <div className="w-full h-full flex flex-col gap-4">
        {/* 상단 타이틀 */}
        <div className="bg-white rounded-xl px-10 py-5">
          <h1 className="text-xl font-bold">게시글 작성</h1>
          <p className="text-sm text-gray-500 mt-1">
            제목과 내용을 작성해주세요.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            작성자: <span className="text-gray-700">{authorName}</span>
          </p>
        </div>

        {/* 작성 폼 */}
        <form
          id="boardWriteForm"
          onSubmit={onSubmit}
          className="bg-white rounded-xl px-10 py-10 flex-1 flex flex-col gap-5"
        >
          {/* 제목 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="h-10 px-3 border rounded-md text-sm outline-none focus:ring-2 focus:ring-black/20 placeholder:text-[12px]"
              maxLength={80}
            />
            <div className="text-xs text-gray-400 text-right">
              {title.length}/80
            </div>
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-semibold text-gray-700">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              className="min-h-60 flex-1 px-3 py-3 border rounded-md text-sm outline-none focus:ring-2 focus:ring-black/20 resize-none placeholder:text-[12px]"
            />
            <div className="text-xs text-gray-400 text-right">
              {content.length}자
            </div>
          </div>

          {/* 에러 */}
          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 border rounded-md text-sm hover:bg-gray-50"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={saving || !isValid}
              className={`h-9 px-4 rounded-md text-sm transition flex items-center gap-2
                ${
                  saving || !isValid
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white hover:bg-gray-900 cursor-pointer"
                }`}
            >
              {saving ? "등록중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
