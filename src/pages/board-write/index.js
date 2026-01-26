import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { ChevronLeft, ImagePlus, Send, X } from "lucide-react";
import { useAccount, useToken } from "@/stores/account-store";

export default function BoardWrite() {
  const router = useRouter();

  const { account } = useAccount();
  const { token } = useToken();

  // (선택) 로그인 안 되어있으면 로그인으로
  // 필요 없으면 지워도 됨
  if (!token) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  const authorName = useMemo(() => account?.name || "익명", [account]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false); // 나중에 권한(사장/팀장)만 허용해도 됨
  const [saving, setSaving] = useState(false);

  // 이미지 업로드(프론트 미리보기만)
  const [images, setImages] = useState([]); // { file, url }
  function onPickImages(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const next = files.slice(0, 6 - images.length).map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
    }));

    setImages((prev) => [...prev, ...next]);
    e.target.value = "";
  }

  function removeImage(idx) {
    setImages((prev) => {
      const copy = [...prev];
      const it = copy[idx];
      if (it?.url) URL.revokeObjectURL(it.url);
      copy.splice(idx, 1);
      return copy;
    });
  }

  function goBack() {
    router.back();
  }

  async function onSubmit(e) {
    e.preventDefault();

    const t = title.trim();
    const c = content.trim();

    if (!t) return alert("제목을 입력해줘!");
    if (!c) return alert("내용을 입력해줘!");

    try {
      setSaving(true);

      // ✅ 여기서 API 붙이면 됨
      // 예시 payload
      const payload = {
        title: t,
        content: c,
        pinned,
        author: authorName,
        // images: 실제 서버 업로드 로직 붙일 때 FormData로 처리 추천
      };

      console.log("POST payload:", payload);

      // TODO: await createBoardPost(payload, token)
      // 성공 시 목록으로
      router.replace("/board");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했어.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full w-full bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={goBack}
            className="h-9 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            뒤로
          </button>

          <div className="min-w-0">
            <h1 className="text-base font-semibold text-neutral-900">글쓰기</h1>
            <p className="mt-1 text-xs text-neutral-500 truncate">
              작성자: <span className="text-neutral-700">{authorName}</span>
            </p>
          </div>
        </div>

        <button
          type="submit"
          form="boardWriteForm"
          disabled={saving}
          className="h-9 px-3 rounded-md bg-slate-900 text-white text-sm font-medium
                     hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed
                     active:scale-[0.99] flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {saving ? "등록 중..." : "등록"}
        </button>
      </div>

      {/* 폼 */}
      <form id="boardWriteForm" onSubmit={onSubmit} className="p-5 space-y-5">
        {/* 제목 */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-600">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full h-10 px-3 rounded-md border border-neutral-200 outline-none
                       focus:border-neutral-400 text-sm"
            maxLength={80}
          />
          <div className="text-[11px] text-neutral-400 text-right">
            {title.length} / 80
          </div>
        </div>

        {/* 옵션 */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-500">
            ※ 공지 고정은 권한별로 제한할 수도 있어요.
          </div>

          <label className="flex items-center gap-2 text-xs text-neutral-700 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="accent-slate-900"
            />
            공지로 고정
          </label>
        </div>

        {/* 내용 */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-600">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            className="w-full min-h-[260px] p-3 rounded-md border border-neutral-200 outline-none
                       focus:border-neutral-400 text-sm leading-relaxed resize-none"
          />
        </div>

        {/* 이미지(선택) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-600">
              이미지 첨부 (선택)
            </label>
            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer text-sm">
              <ImagePlus className="w-4 h-4" />
              이미지 추가
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onPickImages}
                className="hidden"
              />
            </label>
          </div>

          {images.length === 0 ? (
            <div className="h-28 rounded-md border border-dashed border-neutral-200 flex items-center justify-center text-sm text-neutral-400">
              첨부된 이미지가 없어요 (최대 6장)
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative rounded-md border border-neutral-200 overflow-hidden bg-neutral-50"
                >
                  <img
                    src={img.url}
                    alt="preview"
                    className="w-full h-32 object-cover"
                    draggable={false}
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 h-8 w-8 rounded-md bg-white/90 border border-neutral-200
                               hover:bg-white flex items-center justify-center"
                    title="삭제"
                  >
                    <X className="w-4 h-4 text-neutral-600" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-[11px] text-neutral-400">
            * 서버 업로드는 나중에 FormData로 붙이면 돼요.
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.replace("/board")}
            className="h-9 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-sm"
          >
            취소
          </button>

          <button
            type="submit"
            disabled={saving}
            className="h-9 px-3 rounded-md bg-slate-900 text-white text-sm font-medium
                       hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed
                       active:scale-[0.99] flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {saving ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
