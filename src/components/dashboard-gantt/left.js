"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { fmtYMD, safeText } from "./util";

export default function LeftMeta({ meta }) {
  const router = useRouter();
  const wrapRef = useRef(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    const measure = () =>
      setH(Math.floor(el.getBoundingClientRect().height || 0));
    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const id = safeText(meta?.id) || "";
  const title = safeText(meta?.title) || "-";
  const desc = safeText(meta?.description) || "-";
  const date = fmtYMD(meta?.simulationStartDate) || "-";

  const goDetail = () => {
    if (!id) return;
    router.push(`/simulation?open=${encodeURIComponent(id)}`);
  };

  // ✅ Tailwind 동적 class 이슈 방지: 미리 정해진 값만 리턴
  const clampClass = useMemo(() => {
    if (h >= 300) return "line-clamp-6";
    if (h >= 270) return "line-clamp-5";
    if (h >= 240) return "line-clamp-4";
    if (h >= 210) return "line-clamp-3";
    return "line-clamp-2";
  }, [h]);

  return (
    <div
      ref={wrapRef}
      className="h-full min-h-0 bg-white flex flex-col overflow-hidden"
    >
      {/* 본문 */}
      <div className="min-h-0 flex-1 overflow-hidden px-3 pt-2">
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-medium text-slate-500">ID</div>
            <div className="mt-1 text-[12px] font-semibold text-slate-900 truncate">
              {id || "-"}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium text-slate-500">타이틀</div>
            <div className="mt-1 text-[12px] font-semibold text-slate-900 line-clamp-2">
              {title}
            </div>
          </div>

          <div className="min-h-0">
            <div className="text-[10px] font-medium text-slate-500">설명</div>
            <div
              className={[
                "mt-1 text-[11px] text-slate-700 leading-4 truncate",
                clampClass,
              ].join(" ")}
              title={desc}
            >
              {desc}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-medium text-slate-500">시작일</div>
            <div className="mt-1 text-[12px] font-semibold text-slate-900">
              {date}
            </div>
          </div>
        </div>
      </div>

      {/* 하단(항상 보임) */}
      <div className="shrink-0 px-3 pt-2 pb-3">
        <button
          type="button"
          onClick={goDetail}
          disabled={!id}
          className={[
            "w-full text-left",
            "text-[12px] font-medium",
            "text-slate-500",
            "hover:text-indigo-600 hover:underline",
            "transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          자세히 보기
        </button>

        {/* ✅ 안내 문구 */}
        <div className="mt-1 text-[10px] leading-none text-slate-400 truncate">
          시뮬레이션 페이지로 이동합니다.
        </div>
      </div>
    </div>
  );
}
