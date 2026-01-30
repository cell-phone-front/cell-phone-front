// src/components/dashboard/products.js
import { useEffect, useMemo, useState } from "react";
import { useToken } from "@/stores/account-store";
import { getProducts } from "@/api/product-api";

export default function DashboardProducts() {
  const token = useToken((s) => s.token);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!token) return;

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
      .finally(() => setLoading(false));

    return () => {
      alive = false;
    };
  }, [token]);

  const rows = useMemo(() => {
    return (products || []).slice(0, 6).map((p) => {
      const desc = p.description ?? p.desc ?? p.productDesc ?? "";

      return {
        id: p.id ?? p.productId ?? "",
        name: p.name ?? p.productName ?? "",
        // 👇 여기!
        description: desc.length > 18 ? desc.slice(0, 18) + "…" : desc,
      };
    });
  }, [products]);

  return (
    <div className="h-full flex flex-col px-2">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">생산 대상</div>
          <div className="text-[11px] text-gray-500">
            {products.length.toLocaleString()}건
          </div>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => (window.location.href = "/product")}
            className="text-[10px] text-gray-600 hover:underline"
          >
            전체 보기 →
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">불러오는 중…</div>
        ) : loadError ? (
          <div className="p-4 text-sm text-red-600">{loadError}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">
            표시할 생산 대상이 없어요.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-gray-50 text-[10px] text-gray-500">
              <tr className="text-left">
                <th className="px-2 py-1.5 border-b w-[80px]">ID</th>
                <th className="px-2 py-1.5 border-b w-[110px]">Brand</th>
                <th className="px-2 py-1.5 border-b w-[120px]">Description</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => {
                const isLast = idx === rows.length - 1;

                return (
                  <tr
                    key={`${r.id}-${idx}`}
                    className="hover:bg-gray-100 transition-colors"
                  >
                    <td
                      className={[
                        "px-2 py-1.5",
                        !isLast && "border-b",
                        "font-medium",
                      ].join(" ")}
                    >
                      {r.id || "-"}
                    </td>

                    <td
                      className={["px-2 py-1.5", !isLast && "border-b"].join(
                        " ",
                      )}
                    >
                      <div className="font-medium leading-tight">
                        {r.name || "-"}
                      </div>
                      <div className="text-[10px] text-gray-400 leading-tight">
                        {r.model || ""}
                      </div>
                    </td>

                    <td
                      className={[
                        "px-2 py-1.5 text-gray-700 truncate",
                        !isLast && "border-b",
                      ].join(" ")}
                    >
                      {r.description || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
