import React from "react";
import { Eye, X, Download, Paperclip } from "lucide-react";
import {
  fmtDate,
  getWriter,
  getViews,
  normalizeFiles,
} from "@/lib/notice-util";
import { downloadNoticeAttachment } from "@/api/notice-api";

export default function NoticeModal({ open, onClose, notice, token }) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const stop = (e) => e.stopPropagation();

  // 상세에서 merged.files가 들어오면 그걸 우선 사용
  const files = Array.isArray(notice?.files)
    ? notice.files
    : normalizeFiles(notice);
  const hasFiles = files.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-3xl
          rounded-2xl bg-white shadow-2xl
          overflow-hidden
          border border-slate-200
          h-[65vh]
          flex flex-col
        "
        onClick={stop}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 border-slate-200 bg-white/90 backdrop-blur px-10 py-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-3xl font-black tracking-tight text-slate-900 break-words">
                    {notice?.title || "공지사항"}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-slate-400">작성자</span>
                      <span className="text-slate-700 font-semibold">
                        {getWriter(notice)}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <span className="text-slate-400">작성일</span>
                      <span className="text-slate-700 font-semibold tabular-nums">
                        {fmtDate(notice?.createdAt || notice?.date)}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-4 h-4 text-slate-300" />
                      <span className="text-slate-700 font-semibold tabular-nums">
                        {getViews(notice)}
                      </span>
                    </span>
                  </div>

                  {hasFiles ? (
                    <div className="w-172 mt-5 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="px-4 py-2 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-700">
                          <Paperclip className="w-4 h-4 text-indigo-600" />
                          첨부파일
                          <span className="text-slate-400 font-black">
                            ({files.length})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          다운로드만 제공됩니다.
                        </div>
                      </div>

                      <div className=" max-h-[120px] overflow-auto border-t border-slate-200">
                        {files.map((f, idx) => {
                          const key = f?.id ?? f?.url ?? idx;

                          return (
                            <div
                              key={key}
                              className="
                                px-4 py-2.5
                                flex items-center gap-3
                                border-b border-slate-200 last:border-b-0
                              "
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12px] font-medium text-slate-800">
                                  {f?.name || "파일"}
                                </div>
                                <div className="truncate text-[11px] text-slate-500">
                                  {f?.url || ""}
                                </div>
                              </div>

                              {/*  url 또는 id가 있으면 다운로드 가능 */}
                              {f?.url || f?.id != null ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadNoticeAttachment(
                                      notice?.id,
                                      f,
                                      token,
                                    )
                                  }
                                  className="
                                    shrink-0 inline-flex items-center gap-2
                                    h-8 px-3 rounded-lg
                                    border border-indigo-200 bg-white
                                    text-indigo-700 text-[12px] font-bold
                                    hover:bg-indigo-50 active:scale-[0.98]
                                    transition
                                  "
                                  title="다운로드"
                                >
                                  <Download className="w-4 h-4" />
                                  다운로드
                                </button>
                              ) : (
                                <span className="shrink-0 text-[11px] text-slate-400">
                                  링크 없음
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="
                    shrink-0
                    h-9 w-9 rounded-xl
                    border border-slate-200 bg-white
                    grid place-items-center
                    text-slate-500
                    hover:bg-slate-50 hover:text-slate-900
                    active:scale-[0.98]
                    transition
                  "
                  aria-label="닫기"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto px-11">
          <div className="prose prose-slate max-w-none">
            <div className="text-[15px] leading-7 text-slate-800 whitespace-pre-wrap break-words">
              {notice?.content || notice?.description || "내용이 없습니다."}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-10 py-5 flex justify-end">
          <button
            onClick={onClose}
            className="
              h-9 px-6 rounded-xl
              bg-slate-900 text-white
              text-[14px] font-medium
              hover:bg-slate-800
              active:scale-[0.98]
              transition cursor-pointer
            "
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
