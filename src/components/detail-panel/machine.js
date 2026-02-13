// src/components/detail-panel/machine/index.js
import { ChevronRight, X } from "lucide-react";

function Field({ label, value, mono = false }) {
  const v = value == null || value === "" ? "-" : String(value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div
        className={[
          "mt-1 text-[13px] text-slate-800 leading-5 break-words",
          mono ? "font-mono text-[12px]" : "font-medium",
        ].join(" ")}
        title={v}
      >
        {v}
      </div>
    </div>
  );
}

export default function MachineDetailPanel({ open, row, onToggle }) {
  if (!open) {
    return (
      <div className="hidden lg:flex h-full min-h-0">
        <button
          type="button"
          onClick={onToggle}
          className="
            h-full w-12 rounded-2xl
            border border-slate-200 bg-white
            shadow-sm ring-1 ring-black/5
            flex items-center justify-center
            text-slate-500
            hover:text-indigo-700 hover:bg-indigo-50/40
            transition
          "
          aria-label="open detail"
          title="상세 열기"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex h-full min-h-0">
      <div className="w-[360px] h-full min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
        {/* Header (Tasks 톤) */}
        <div className="shrink-0 px-4 py-1 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-slate-900 truncate">
                상세 정보
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggle}
                className="
                  h-8 w-8 rounded-xl
                  grid place-items-center
                  text-slate-500
                  hover:bg-white hover:text-slate-700
                  border border-transparent hover:border-slate-200
                  transition
                "
                aria-label="collapse"
                title="접기"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>

              <button
                type="button"
                onClick={onToggle}
                className="
                  h-8 w-8 rounded-xl
                  grid place-items-center
                  text-slate-400
                  hover:bg-white hover:text-slate-700
                  border border-transparent hover:border-slate-200
                  transition
                "
                aria-label="close"
                title="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll p-3">
          {!row ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[12px] font-semibold text-slate-700">
                선택된 행이 없습니다.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <Field label="기계 품번 (Machine Id)" value={row.id} mono />
              <Field label="기계 이름 (Name)" value={row.name} />
              <Field label="기계 이름(KR)" value={row.koreanName} />
              <Field label="기계 설명 (Description)" value={row.description} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2">
          <div className="text-[11px] text-slate-500 truncate">
            {row ? (
              <>
                선택:{" "}
                <span className="font-semibold text-slate-900">
                  {row.id || "-"}
                </span>
              </>
            ) : (
              "상세 패널"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
