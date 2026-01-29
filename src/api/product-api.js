// src/api/product-api.js
const serverAddr = "http://localhost:8080";

// (1) 생산 대상 전체 조회
export async function getProduct() {
  const response = await fetch(`${serverAddr}/api/operation/product`);
  const json = await response.json();
  return json;
}

// (2) 생산 대상 upsert (추가/수정/삭제)
export async function postProduct(products) {
  const response = await fetch(`${serverAddr}/api/operation/product/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productList: products,
    }),
  });

  return response.ok; // 200~299
}

// (3) 생산 대상 엑셀 파싱
export async function parseXLS(file) {
  const formData = new FormData();
  formData.append("file", file); // ⚠️ 백엔드가 operationFile이면 바꿔야 함

  const response = await fetch(`${serverAddr}/api/operation/product/xls`, {
    method: "POST",
    body: formData,
  });

  const json = await response.json();
  return json;
}
