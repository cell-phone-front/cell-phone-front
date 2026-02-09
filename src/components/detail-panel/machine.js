// src/components/detail-panel/machine/index.js
import { ChevronRight } from "lucide-react";

function Field({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[12px] font-bold text-slate-800 break-words">
        {value == null || value === "" ? "-" : String(value)}
      </div>
    </div>
  );
}

export default function MachineDetailPanel({ open, row, onToggle }) {
  if (!open) {
    return (
      <div className="hidden lg:flex h-full min-h-0 ">
        <button
          type="button"
          onClick={onToggle}
          className="
            h-full w-12 rounded-xl border bg-white shadow-sm
            ring-black/5
            flex items-center justify-center
            text-slate-500

            hover:text-indigo-700
            hover:bg-gray-200
            transition
            cursor-pointer
          "
          aria-label="open detail"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex min-h-0">
      <div className="w-[340px] rounded-2xl border bg-white shadow-sm ring-black/5 overflow-hidden flex flex-col min-h-0">
        <div className="shrink-0 h-11 px-4 border-b bg-gray-200 flex items-center justify-between gap-2">
          <div className="min-w-0 flex gap-2">
            <div className="text-[13px] font-extrabold text-slate-800 leading-4">
              상세 정보
            </div>
            <div className="text-[11px] text-slate-500 leading-4">
              행을 클릭하면 여기에서 확인됩니다.
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="h-8 w-8 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500"
            aria-label="collapse"
            title="접기"
          >
            <ChevronRight className="h-4 w-4 rotate-180 mx-auto" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto pretty-scroll p-4">
          {!row ? (
            <div className="rounded-xl border bg-white p-4 text-[11px] text-slate-500">
              선택된 행이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Machine Id" value={row.id} />
              <Field label="Name" value={row.name} />
              <Field label="Description" value={row.description} />

              <div className="rounded-xl border bg-white p-4">
                <div className="text-[11px] font-semibold text-slate-500">
                  Status
                </div>
                <div className="mt-2 text-[12px] font-bold text-slate-800">
                  {row.flag === "pre"
                    ? "Imported"
                    : row.flag === "new"
                      ? "New"
                      : "Saved"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
