import React from "react";
import DashboardShell from "@/components/dashboard-shell";

export default function NoticeWrite() {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [pinned, setPinned] = React.useState(false);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const t = title.trim();
    const c = content.trim();

    if (!t) return setError("제목을 입력해주세요.");
    if (!c) return setError("내용을 입력해주세요.");

    try {
      setSaving(true);

      // ✅ TODO: 여기서 API 붙이면 됨
      // await fetch("/api/notices", { method: "POST", body: JSON.stringify({ title: t, content: c, pinned }) })
      console.log("submit payload:", { title: t, content: c, pinned });

      // 임시: 저장 성공했다고 가정
      alert("저장 완료! (지금은 콘솔에만 찍혀요)");
      setTitle("");
      setContent("");
      setPinned(false);

      // ✅ TODO: 저장 후 목록으로 이동하고 싶으면 라우터로 이동
      // navigate("/notice"); 또는 router.push("/notice");
    } catch (err) {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    // ✅ TODO: 뒤로가기/목록 이동 처리
    // navigate(-1) 또는 router.back()
    if (title || content) {
      const ok = window.confirm("작성 중인 내용이 사라집니다. 취소할까요?");
      if (!ok) return;
    }
    setTitle("");
    setContent("");
    setPinned(false);
  };
  const isValid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="공지사항 작성">
      <div className="w-full h-full flex flex-col gap-4">
        {/* 상단 타이틀 */}
        <div className="bg-white rounded-xl px-10 py-5">
          <h1 className="text-xl font-bold">공지사항 작성</h1>
          <p className="text-sm text-gray-500 mt-1">
            공지사항 제목과 내용을 작성해주세요.
          </p>
        </div>

        {/* 작성 폼 */}
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-xl px-10 py-10 flex-1 flex flex-col gap-5"
        >
          {/* 고정글 체크 */}
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
            <span className="text-xs text-gray-400">
              (최대 3개 고정은 목록에서 제어)
            </span>
          </div>

          {/* 제목 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목을 입력하세요"
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
              placeholder="공지사항 내용을 입력하세요"
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
              className={`h-9 px-4 rounded-md text-sm transition
    ${
      saving || !isValid
        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        : "bg-black text-white hover:bg-gray-900 cursor-pointer"
    }
  `}
            >
              {saving ? "저장중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
