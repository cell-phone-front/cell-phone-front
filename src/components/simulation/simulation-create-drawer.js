import { useMemo } from "react";
import { X, ClipboardList, Plus } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

function Chip({ id, onRemove }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
      <div className="text-[11px] font-mono text-slate-800">{String(id)}</div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        title="삭제"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function SimulationCreateDrawer({
  open,
  onOpenChange,

  canEdit,

  products,
  prodLoading,
  prodErr,

  newForm,
  setNewForm,

  onCreate,
}) {
  const TITLE_MAX = 60;
  const DESC_MAX = 255;

  const isFormValid = useMemo(() => {
    const titleOk = String(newForm.title || "").trim().length > 0;
    const productOk = (newForm.productIds || []).length > 0;

    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(String(newForm.startDate || ""));
    const timeOk = /^\d{2}:\d{2}$/.test(String(newForm.startTime || ""));

    const staffOk =
      newForm.requiredStaff === "" ||
      (!Number.isNaN(Number(newForm.requiredStaff)) &&
        Number(newForm.requiredStaff) >= 0);

    return titleOk && productOk && dateOk && timeOk && staffOk;
  }, [newForm]);

  const toggleProduct = (p, checked) => {
    const pid = String(p.id);
    const pname = String(p.name || "");

    setNewForm((s) => {
      const ids = new Set((s.productIds || []).map(String));
      const namesById = new Map(
        (s.productIds || []).map((id, idx) => [
          String(id),
          String(s.productNames?.[idx] || ""),
        ]),
      );

      if (checked) {
        ids.add(pid);
        namesById.set(pid, pname);
      } else {
        ids.delete(pid);
        namesById.delete(pid);
      }

      const nextIds = Array.from(ids);
      const nextNames = nextIds.map((id) => namesById.get(id) || "");

      return { ...s, productIds: nextIds, productNames: nextNames };
    });
  };

  const clearAllProducts = () => {
    setNewForm((s) => ({ ...s, productIds: [], productNames: [] }));
  };

  const removeOneSelected = (pid) => {
    setNewForm((s) => {
      const nextIds = (s.productIds || []).filter(
        (x) => String(x) !== String(pid),
      );

      const nextNames = nextIds.map((id) => {
        const idx = (s.productIds || []).findIndex(
          (x) => String(x) === String(id),
        );
        return String(s.productNames?.[idx] || "");
      });

      return { ...s, productIds: nextIds, productNames: nextNames };
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      {/* ✅ 높이/스크롤 고정: h-dvh + 내부 flex + min-h-0 */}
      <DrawerContent className="fixed right-0 top-0 h-dvh w-[420px] sm:w-[520px] rounded-none border-l border-slate-200 bg-white p-0">
        <div className="flex h-dvh min-h-0 flex-col">
          {/* ===== Header (Tasks 틀 톤) ===== */}
          <DrawerHeader className="shrink-0 border-b border-slate-100 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-sm shrink-0">
                  <ClipboardList className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <DrawerTitle className="text-[18px] font-semibold text-slate-900 truncate">
                    시뮬레이션 생성
                  </DrawerTitle>
                  <div className="mt-0.5 text-[12px] text-slate-500 truncate">
                    제목/설명/생산대상 입력해 생성합니다.
                  </div>
                </div>
              </div>

              <DrawerClose asChild>
                <button
                  type="button"
                  className="
                    h-10 w-10 rounded-full
                    border border-slate-200 bg-white
                    text-slate-500
                    hover:bg-slate-50 hover:text-slate-800
                    transition grid place-items-center
                  "
                  aria-label="close"
                  title="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {/* ===== Body (scroll) ===== */}
          <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll px-5 py-3 space-y-2">
            {/* Title */}
            <div className="rounded-2xl  bg-white p-4">
              <div className="flex items-end justify-between mb-2">
                <div className="text-[11px] font-semibold text-slate-500">
                  제목
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {(newForm.title || "").length}/{TITLE_MAX}
                </div>
              </div>

              <input
                value={newForm.title || ""}
                maxLength={TITLE_MAX}
                onChange={(e) =>
                  setNewForm((s) => ({ ...s, title: e.target.value }))
                }
                className="
                  h-10 w-full rounded-xl border border-slate-200 bg-white
                  px-3 text-[13px] outline-none transition
                  hover:border-slate-300
                  focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                  placeholder:text-[12px] placeholder:text-slate-400
                "
                placeholder="제목"
              />
            </div>

            {/* Description */}
            <div className=" bg-white p-4">
              <div className="flex items-end justify-between mb-2">
                <div className="text-[11px] font-semibold text-slate-500">
                  설명
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {(newForm.description || "").length}/{DESC_MAX}
                </div>
              </div>

              <textarea
                value={newForm.description || ""}
                maxLength={DESC_MAX}
                onChange={(e) =>
                  setNewForm((s) => ({ ...s, description: e.target.value }))
                }
                className="
                  h-28 w-full rounded-xl border border-slate-200 bg-white
                  px-3 py-2 text-[13px] outline-none transition resize-none
                  hover:border-slate-300
                  focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                  placeholder:text-[12px] placeholder:text-slate-400
                "
                placeholder="설명"
              />
            </div>

            {/* Product list */}
            <div className=" bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-slate-500">
                  생산 대상 리스트
                </div>

                {(newForm.productIds || []).length > 0 ? (
                  <button
                    type="button"
                    onClick={clearAllProducts}
                    className="text-[11px] font-semibold text-slate-500 hover:text-indigo-700"
                  >
                    선택해제
                  </button>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="max-h-[320px] overflow-y-auto pretty-scroll p-2 space-y-1">
                  {prodLoading ? (
                    <div className="px-2 py-2 text-[12px] text-slate-500">
                      제품 목록 불러오는 중...
                    </div>
                  ) : products.length === 0 ? (
                    <div className="px-2 py-2 text-[12px] text-slate-500">
                      등록된 제품이 없습니다.
                    </div>
                  ) : (
                    products.map((p) => {
                      const pid = String(p.id);
                      const pname = String(p.name || "");
                      const checked = (newForm.productIds || []).some(
                        (x) => String(x) === pid,
                      );

                      return (
                        <label
                          key={pid}
                          className={[
                            "flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition",
                            "hover:bg-indigo-50/40",
                            checked ? "bg-indigo-50/60" : "",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-indigo-600"
                            checked={checked}
                            onChange={(e) => toggleProduct(p, e.target.checked)}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[11px] font-mono text-slate-800">
                                {pid}
                              </span>
                              <span className="text-[11px] text-slate-300">
                                —
                              </span>
                              <span className="text-[12px] text-slate-700 truncate">
                                {pname || "-"}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {prodErr ? (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                  {prodErr}
                </div>
              ) : null}
            </div>

            {/* Selected */}
            <div className=" bg-white p-4">
              <div className="flex items-end justify-between mb-3">
                <div className="text-[11px] font-semibold text-slate-500">
                  선택된 생산 대상
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  {(newForm.productIds || []).length}개 선택됨
                </div>
              </div>

              {(newForm.productIds || []).length === 0 ? (
                <div className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center text-[12px] text-slate-400">
                  -
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap gap-2">
                  {(newForm.productIds || []).map((id) => (
                    <Chip
                      key={String(id)}
                      id={id}
                      onRemove={() => removeOneSelected(id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Staff + Date/Time */}
            <div className="grid grid-cols-1 gap-4">
              <div className=" bg-white p-4">
                <div className="text-[11px] font-semibold text-slate-500 mb-2">
                  인원
                </div>
                <input
                  type="number"
                  value={newForm.requiredStaff}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, requiredStaff: e.target.value }))
                  }
                  className="
                    h-10 w-full rounded-xl border border-slate-200 bg-white
                    px-3 text-[13px] outline-none transition
                    hover:border-slate-300
                    focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                    placeholder:text-[12px] placeholder:text-slate-400
                  "
                  min={0}
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className=" bg-white p-4">
                  <div className="text-[11px] font-semibold text-slate-500 mb-2">
                    시작 날짜
                  </div>
                  <input
                    type="date"
                    value={newForm.startDate || ""}
                    onChange={(e) =>
                      setNewForm((s) => ({ ...s, startDate: e.target.value }))
                    }
                    data-vaul-no-drag
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    className="
                      h-10 w-full rounded-xl border border-slate-200 bg-white
                      px-3 text-[13px] outline-none transition
                      hover:border-slate-300
                      focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                    "
                  />
                </div>

                <div className=" bg-white p-4">
                  <div className="text-[11px] font-semibold text-slate-500 mb-2">
                    시작 시간
                  </div>
                  <input
                    type="time"
                    value={newForm.startTime || ""}
                    onChange={(e) =>
                      setNewForm((s) => ({ ...s, startTime: e.target.value }))
                    }
                    data-vaul-no-drag
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    className="
                      h-10 w-full rounded-xl border border-slate-200 bg-white
                      px-3 text-[13px] outline-none transition
                      hover:border-slate-300
                      focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                    "
                  />
                </div>
              </div>
            </div>

            {/* hint */}
            {!isFormValid ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-700">
                제목/생산대상/시작일시(형식)를 확인해 주세요.
              </div>
            ) : null}
          </div>

          {/* ===== Footer (sticky) ===== */}
          <DrawerFooter className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCreate}
                disabled={!canEdit || !isFormValid}
                className={[
                  "h-10 flex-1 rounded-full px-5",
                  "inline-flex items-center justify-center gap-2",
                  "text-[13px] font-semibold transition",
                  !canEdit || !isFormValid
                    ? "bg-indigo-50 text-indigo-300 border border-indigo-100 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 active:scale-[0.98] shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200",
                ].join(" ")}
                title={
                  !canEdit
                    ? "권한 없음"
                    : !isFormValid
                      ? "필수 항목을 입력해 주세요"
                      : ""
                }
              >
                <Plus className="h-4 w-4" />
                생성
              </button>

              <DrawerClose asChild>
                <button
                  type="button"
                  className="
                    h-10 px-5 rounded-full
                    border border-slate-200 bg-white
                    text-[13px] font-semibold text-slate-700
                    hover:bg-slate-50
                    transition
                  "
                >
                  취소
                </button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
