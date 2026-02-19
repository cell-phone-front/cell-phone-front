// src/api/product-api.js
const serverAddr = "http://54.180.121.234:8080";

// 생산 대상 전체 조회 (+ 검색)
export async function getProducts(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/operation/product?keyword=${keyword}`
    : `${serverAddr}/api/operation/product`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(json?.message || `조회 실패 (${res.status})`);
  }

  return json;
}

// 생산 대상 upsert (등록/수정/삭제 동기화)
export async function postProducts(products, token) {
  const res = await fetch(`${serverAddr}/api/operation/product/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ productList: products }),
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(json?.message || `저장 실패 (${res.status})`);
  }

  return json;
}

// 생산 대상 엑셀 파싱
export async function parseProductXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${serverAddr}/api/operation/product/xls`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
    body: formData,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(json?.message || `엑셀 파싱 실패 (${res.status})`);
  }

  return json;
}
