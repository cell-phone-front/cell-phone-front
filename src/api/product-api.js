// src/api/product-api.js
const serverAddr = "http://3.36.47.128:8080";

// 생산 대상 전체 조회
// 생산 대상 전체 조회 + 검색
export async function getProducts(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/operation/product?keyword=${keyword}`
    : `${serverAddr}/api/operation/product`;

  return fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// 생산 대상 upsert
export async function postProducts(products, token) {
  return fetch(`${serverAddr}/api/operation/product/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ productList: products }),
  });
}

// 생산 대상 엑셀 파싱
export async function parseProductXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  return fetch(`${serverAddr}/api/operation/product/xls`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
    body: formData,
  }).then((r) => r.json());
}
