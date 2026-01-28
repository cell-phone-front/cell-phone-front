import React, { useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useRouter } from "next/router";
import { useAccount, useToken } from "@/stores/account-store";
import { createNotice } from "@/api/notice-api";

export default function NoticeWrite() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const memberId = account?.id;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const t = title.trim();
    const c = content.trim();

    if (!t) return setError("제목을 입력해주세요.");
    if (!c) return setError("내용을 입력해주세요.");
    if (!token) return setError("토큰이 없습니다. 다시 로그인 해주세요.");
    if (!memberId)
      return setError("memberId가 없습니다. 로그인 정보를 확인해주세요.");

    try {
      setSaving(true);

      const payload = {
        title: t,
        description: c, //  백엔드 키
        memberId: memberId, // member.id
        pinned: pinned,
      };

      console.log("submit payload:", payload);
      console.log("token head:", String(token).slice(0, 20) + "...");

      const result = await createNotice(payload, token);

      if (!result) {
        setError("저장 실패! (Network 탭에서 POST /api/notice 응답 확인)");
        return;
      }

      alert("저장 완료!");
      router.push("/notice");
    } catch (err) {
      console.error(err);
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    if (title || content) {
      const ok = window.confirm("작성 중인 내용이 사라집니다. 취소할까요?");
      if (!ok) return;
    }
    router.push("/notice");
  };

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="공지사항 작성">
      <div className="w-full h-full flex flex-col gap-4">
        <div className="bg-white rounded-xl px-10 py-5">
          <h1 className="text-xl font-bold">공지사항 작성</h1>
          <p className="text-sm text-gray-500 mt-1">
            공지사항 제목과 내용을 작성해주세요.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-xl px-10 py-10 flex-1 flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <input
              id="pinned"
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="pinned" className="text-sm text-gray-700">
              상단 고정(📌)
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목을 입력하세요"
              className="h-10 px-3 border rounded-md text-sm outline-none"
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-semibold text-gray-700">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지사항 내용을 입력하세요"
              className="min-h-60 flex-1 px-3 py-3 border rounded-md text-sm outline-none resize-none"
            />
          </div>

          {error ? <div className="text-sm text-red-500">{error}</div> : null}

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
              className={`h-9 px-4 rounded-md text-sm transition
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
