// src/hooks/useTableQueryFromRouter.js
import { useEffect } from "react";

export default function useTableQueryFromRouter(router, setQuery, opts = {}) {
  const {
    preferFocus = true,
    onlyWhenEmpty = true,
    currentValue = "",
    onApplied,
  } = opts;

  useEffect(() => {
    if (!router?.isReady) return;

    const focus = router.query?.focus != null ? String(router.query.focus) : "";
    const keyword =
      router.query?.keyword != null ? String(router.query.keyword) : "";

    const next = (preferFocus ? focus || keyword : keyword || focus).trim();
    if (!next) return;

    if (onlyWhenEmpty && String(currentValue || "").trim()) return;

    setQuery(next);
    if (typeof onApplied === "function") onApplied(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router?.isReady, router?.query?.focus, router?.query?.keyword]);
}
