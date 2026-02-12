// src/components/detail-panel/product.js
import { ChevronRight } from "lucide-react";

function Field({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] font-bold text-slate-800 break-words">
        {value == null || value === "" ? "-" : String(value)}
      </div>
    </div>
  );
}

function StatusText(flag) {
  if (flag === "pre") return "Imported";
  if (flag === "new") return "New";
  return "Saved";
}

export default function ProductDetailPanel({ open, row, onToggle }) {
  if (!open) {
    return (
      <div className="hidden lg:flex h-full min-h-0">
        <button
          type="button"
          onClick={onToggle}
          className="
            h-full w-12 rounded-xl border bg-white shadow-sm
            ring-black/5
            flex items-center justify-center
            text-slate-500 hover:text-indigo-700 hover:bg-indigo-50/40
            transition
          "
          aria-label="open detail"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex h-full min-h-0">
      <div className="w-[360px] rounded-2xl border bg-white shadow-sm ring-black/5 overflow-hidden flex flex-col min-h-0">
        <div className="shrink-0 px-4 py-1.5 border-b bg-gray-200 text-indigo-900 flex items-center justify-between">
          <div className="text-[13px] font-extrabold">상세 정보</div>
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

        <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll p-4">
          {!row ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px] text-slate-600">
              행을 선택하면 상세가 표시됩니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <Field label="Id" value={row.id} />
              <Field label="Brand" value={row.brand} />
              <Field label="Name" value={row.name} />
              <Field label="Description" value={row.description} />
              <Field label="Status" value={StatusText(row.flag)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
