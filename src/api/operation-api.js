// src/api/operation-api.js
const serverAddr = "http://localhost:8080";

// 공정 단계 전체 조회
export async function getOperations(token) {
  return fetch(`${serverAddr}/api/operation`, {
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// 공정 단계 upsert
export async function postOperations(operations, token) {
  return fetch(`${serverAddr}/api/operation/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ operationList: operations }),
  });
}

// 공정 단계 엑셀 파싱
export async function parseOperationXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  return fetch(`${serverAddr}/api/operation/xls`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
    body: formData,
  }).then((r) => r.json());
}

