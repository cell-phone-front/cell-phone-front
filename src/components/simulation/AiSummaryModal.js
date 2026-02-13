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
  summary = "",
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="close"
      />

      {/* modal */}
      <div className="relative w-full max-w-3xl h-[80vh] rounded-2xl border bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* ================= Header ================= */}
        <div className="shrink-0 px-5 py-4 border-b bg-indigo-900 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="text-[15px] font-bold truncate">{title}</div>

                <div className="mt-0.5 text-[11px] text-indigo-200 truncate">
                  시뮬레이션 AI 분석 요약 결과
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="
                shrink-0 h-9 w-9 rounded-xl
                bg-white/10 hover:bg-white/20
                transition grid place-items-center
              "
              aria-label="close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ================= Body ================= */}
        <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll p-5 bg-slate-50">
          {!hasSummary ? (
            <div className="h-full flex items-center justify-center">
              <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
                <div className="text-[14px] font-semibold text-slate-800">
                  AI 요약이 없습니다
                </div>

                <div className="mt-1 text-[12px] text-slate-500">
                  아직 분석 결과가 생성되지 않았습니다.
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-3">
              {/* title */}
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-slate-900">
                  AI 분석 코멘트
                </div>

                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  AI
                </span>
              </div>

              {/* content */}
              <div
                className="
                  whitespace-pre-wrap
                  text-[13px]
                  leading-6
                  text-slate-700
                "
              >
                {summary}
              </div>
            </div>
          )}
        </div>

        {/* ================= Footer ================= */}
        <div className="shrink-0 px-5 py-3 border-t bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="
              h-9 px-5 rounded-xl
              border border-slate-200
              bg-white
              text-[12px] font-semibold text-slate-700
              hover:bg-slate-50
              transition
            "
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
