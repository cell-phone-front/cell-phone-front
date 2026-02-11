import { useMemo } from "react";
import { X } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
      <DrawerContent className="fixed right-0 top-0 h-dvh w-[420px] sm:w-[520px] rounded-none border-l bg-white p-0">
        <div className="flex h-dvh flex-col">
          <DrawerHeader></DrawerHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Title */}
            <div>
              <div className="flex items-end justify-between mb-1">
                <div className="text-xs text-gray-500">제목</div>
                <div className="text-[11px] text-gray-400">
                  {(newForm.title || "").length}/{TITLE_MAX}
                </div>
              </div>

              <input
                value={newForm.title}
                maxLength={TITLE_MAX}
                onChange={(e) =>
                  setNewForm((s) => ({ ...s, title: e.target.value }))
                }
                className="h-10 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm placeholder:text-xs"
                placeholder="제목"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-end justify-between mb-1">
                <div className="text-xs text-gray-500">내용</div>
                <div className="text-[11px] text-gray-400">
                  {(newForm.description || "").length}/{DESC_MAX}
                </div>
              </div>

              <textarea
                value={newForm.description}
                maxLength={DESC_MAX}
                onChange={(e) =>
                  setNewForm((s) => ({ ...s, description: e.target.value }))
                }
                className="h-30 w-full rounded-md border px-2 py-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm placeholder:text-xs resize-none"
                placeholder="내용"
              />
            </div>

            {/* Product list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500">생산 대상 리스트</div>

                {(newForm.productIds || []).length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllProducts}
                    className="text-[11px] text-gray-500 hover:text-gray-800"
                  >
                    선택해제
                  </button>
                )}
              </div>

              <div className="rounded-md border bg-white">
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
                  {prodLoading ? (
                    <div className="px-2 py-2 text-xs text-gray-500">
                      제품 목록 불러오는 중...
                    </div>
                  ) : products.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-gray-500">
                      등록된 제품이 없습니다
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
                            "flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer",
                            "hover:bg-slate-100",
                            checked ? "bg-slate-100" : "",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-black"
                            checked={checked}
                            onChange={(e) => toggleProduct(p, e.target.checked)}
                          />

                          <div className="min-w-0 flex-1 text-[12px] leading-none">
                            <span className="font-mono text-gray-900">
                              {pid}
                            </span>
                            <span className="mx-2 text-gray-400">—</span>
                            <span className="text-gray-700 truncate inline-block align-bottom max-w-[320px]">
                              {pname || "-"}
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {prodErr ? (
                <div className="mt-2 text-xs text-red-600">{prodErr}</div>
              ) : null}
            </div>

            {/* Selected */}
            <div>
              <div className="text-xs text-gray-500 mb-2">
                선택된 생산 대상
                <span className="ml-2 text-[11px] text-gray-400">
                  {(newForm.productIds || []).length}개 선택됨
                </span>
              </div>

              {(newForm.productIds || []).length === 0 ? (
                <div className="h-10 w-full rounded-md border bg-gray-50 px-3 flex items-center text-sm text-gray-400">
                  -
                </div>
              ) : (
                <div className="rounded-md border bg-gray-50 p-2 flex flex-wrap gap-2">
                  {(newForm.productIds || []).map((id) => (
                    <div
                      key={String(id)}
                      className="inline-flex items-center gap-2 rounded-md border bg-white px-2 py-1"
                    >
                      <div className="text-[12px] font-mono text-gray-800">
                        {String(id)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOneSelected(id)}
                        className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded hover:bg-gray-100"
                        title="삭제"
                      >
                        <X className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff */}
            <div>
              <div className="text-xs text-gray-500 mb-1">인원</div>
              <input
                type="number"
                value={newForm.requiredStaff}
                onChange={(e) =>
                  setNewForm((s) => ({ ...s, requiredStaff: e.target.value }))
                }
                className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm placeholder:text-xs"
                min={0}
                placeholder="인원"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">시작 날짜</div>
                <input
                  type="date"
                  value={newForm.startDate || ""}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, startDate: e.target.value }))
                  }
                  data-vaul-no-drag
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm"
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">시작 시간</div>
                <input
                  type="time"
                  value={newForm.startTime || ""}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, startTime: e.target.value }))
                  }
                  data-vaul-no-drag
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white text-sm"
                />
              </div>
            </div>
          </div>

          <DrawerFooter>
            <button
              type="button"
              onClick={onCreate}
              disabled={!canEdit || !isFormValid}
              className={[
                "h-9 rounded-md border px-4 text-sm transition",
                !canEdit || !isFormValid
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-900 border-gray-200 hover:bg-gray-100 cursor-pointer",
              ].join(" ")}
              title={
                !canEdit
                  ? "권한 없음"
                  : !isFormValid
                    ? "필수 항목을 입력해 주세요"
                    : ""
              }
            >
              생성
            </button>

            <DrawerClose asChild>
              <button
                type="button"
                className="h-9 rounded-md border border-gray-200 bg-white px-4 text-sm hover:bg-gray-100"
              >
                취소
              </button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
