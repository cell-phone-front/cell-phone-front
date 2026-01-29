// src/api/operation-api.js
const serverAddr = "http://localhost:8080";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function getOperations(token) {
  const res = await fetch(`${serverAddr}/api/operation`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token, //  토큰 필요
    },
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || `공정단계 조회 실패 (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function postOperations(operations, token) {
  const res = await fetch(`${serverAddr}/api/operation/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token, // 토큰 필요
    },
    body: JSON.stringify({ operationList: operations }),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || `공정단계 저장 실패 (${res.status})`;
    throw new Error(msg);
  }

  return true;
}

export async function parseOperationXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${serverAddr}/api/operation/xls`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token, // 토큰 필요
    },
    body: formData,
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || `엑셀 파싱 실패 (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
