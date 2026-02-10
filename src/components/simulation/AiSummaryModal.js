"use client";

import React, { useEffect } from "react";
import { X, Sparkles } from "lucide-react";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function AiSummaryModal({
  open,
  onClose,
  title = "AI Summary",
  summary = "", // ✅ aiSummary 문자열 하나만 받기
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const hasSummary = Boolean(String(summary || "").trim());

  return (
    <div className="fixed inset-0 z-[200]">
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-label="close"
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* header */}
          <div className="px-5 py-4 border-b bg-white/90 backdrop-blur flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="text-[14px] font-black text-slate-900">
                  {title}
                </div>
              </div>
              <div className="mt-1 text-[12px] font-semibold text-slate-500">
                시뮬레이션 결과의 aiSummary를 표시합니다.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"
              aria-label="close"
            >
              <X className="h-4 w-4 text-slate-700" />
            </button>
          </div>

          {/* body */}
          <div className="max-h-[70vh] overflow-y-auto p-4">
            {!hasSummary ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[13px] font-extrabold text-slate-800">
                  표시할 aiSummary가 없습니다.
                </div>
                <div className="mt-1 text-[12px] font-semibold text-slate-500">
                  아직 aiSummary가 null 이거나 비어있습니다.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[12px] font-black text-slate-900">
                    AI 코멘트
                  </div>
                  <div className="shrink-0 text-[11px] font-extrabold text-slate-400">
                    AI
                  </div>
                </div>

                {/* ✅ 줄바꿈 유지 */}
                <div className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-slate-700">
                  {summary}
                </div>
              </div>
            )}
          </div>

          {/* footer */}
          <div className="px-5 py-3 border-t bg-slate-50 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className={cx(
                "rounded-xl px-4 py-2 text-[12px] font-extrabold",
                "border border-slate-200 bg-white hover:bg-slate-50",
              )}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
