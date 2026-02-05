// src/api/product-api.js
const serverAddr = "http://localhost:8080";

// 생산 대상 전체 조회
export async function getProducts(token) {
  return fetch(`${serverAddr}/api/operation/product`, {
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
