import { useEffect, useMemo, useState } from "react";
import { useAccount, useToken } from "@/stores/account-store";
import { getProducts } from "@/api/product-api";

export default function DashboardProducts() {
  const token = useToken((s) => s.token);
  const { account } = useAccount(); // 있으면 사용
  const role = String(account?.role || "").toLowerCase();
  const canSeeProducts = role === "admin" || role === "planner";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // ✅ 훅은 return 위에서 항상 호출
  const rows = useMemo(() => {
    return (products || []).slice(0, 6).map((p) => {
      const desc = p.description ?? p.desc ?? p.productDesc ?? "";
      return {
        id: p.id ?? p.productId ?? "",
        name: p.name ?? p.productName ?? "",
        model: p.model ?? p.productModel ?? "",
        rawDesc: desc,
        description: desc.length > 28 ? desc.slice(0, 28) + "…" : desc,
      };
    });
  }, [products]);

  useEffect(() => {
    if (!token) return;
    if (!canSeeProducts) return; // ✅ fetch만 막아도 됨 (훅 호출 순서는 유지)

    let alive = true;
    setLoading(true);
    setLoadError("");

    getProducts(token)
      .then((json) => {
        if (!alive) return;
        const list = json?.productList || json?.products || json?.items || [];
        setProducts(list);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err?.message || "생산 대상 불러오기 실패");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token, canSeeProducts]);

  // ✅ 여기서 숨김 처리해도 OK (훅은 이미 다 호출됨)
  if (!canSeeProducts) return null;

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 헤더 */}
      <div className="px-3 pt-2 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mt-0.5 text-[11px] text-slate-500">
              최신 6개 항목을 표시합니다.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/product"
              className="rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-slate-700 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 active:bg-gray-100"
            >
              전체 보기 →
            </a>
          </div>
        </div>
      </div>

      {/* 리스트 */}
      <div className="flex-1 min-h-0 overflow-auto pb-3">
        {loading ? (
          <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm ring-1 ring-black/5">
            불러오는 중…
          </div>
        ) : loadError ? (
          <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-rose-700 shadow-sm ring-1 ring-black/5">
            {loadError}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm ring-1 ring-black/5">
            표시할 생산 대상이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 z-10 bg-white/75 backdrop-blur text-[10.5px] text-slate-500">
                <tr className="text-left">
                  <th className="px-5 py-2 font-medium">ID</th>
                  <th className="px-4 py-2 font-medium">Brand</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr
                    key={`${r.id}-${idx}`}
                    className="group hover:bg-gray-200/70 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-2 align-top">
                      {r.id ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                          {r.id}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Brand */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-slate-900 leading-tight">
                        {r.name || "-"}
                      </div>
                      {r.model ? (
                        <div className="mt-1 text-[11px] text-slate-500 leading-tight">
                          {r.model}
                        </div>
                      ) : null}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 align-top">
                      <div
                        className="text-slate-700 line-clamp-1"
                        title={r.rawDesc || ""}
                      >
                        {r.description || "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
