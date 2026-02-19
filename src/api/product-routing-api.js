// src/api/product-routing-api.js

const serverAddr = "http://54.180.121.234:8080";

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/* =========================
 * (1) Product Routing 목록 조회 (+검색)
 * GET /api/operation/product/routing?keyword=
 * ========================= */
export async function getProductRoutings(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/operation/product/routing?keyword=${encodeURIComponent(
        keyword,
      )}`
    : `${serverAddr}/api/operation/product/routing`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);
  if (!res.ok) {
    throw new Error(json?.message || "Product Routing 불러오기 실패");
  }
  return json;
}

/* =========================
 * (2) XLS 파싱
 * POST /api/operation/product/routing/xls
 * form-data: file
 * ========================= */
export async function parseProductRoutingXLS(file, token) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${serverAddr}/api/operation/product/routing/xls`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: fd,
  });

  const json = await safeJson(res);
  if (!res.ok) {
    throw new Error(json?.message || "Product Routing 엑셀 파싱 실패");
  }
  return json;
}

/* =========================
 * (3) Upsert 저장
 * POST /api/operation/product/routing/upsert
 * body: { productRoutingList: [...] }
 * ========================= */
export async function postProductRoutings(productRoutingList, token) {
  const body = { productRoutingList: productRoutingList || [] };

  const res = await fetch(
    `${serverAddr}/api/operation/product/routing/upsert`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const json = await safeJson(res);
  if (!res.ok) {
    throw new Error(json?.message || "Product Routing 저장 실패");
  }
  return json;
}
