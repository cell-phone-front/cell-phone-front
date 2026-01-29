// src/api/task-api.js
const serverAddr = "http://localhost:8080";

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// (1) 작업 전체 조회
export async function getTasks(token) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;

  const response = await fetch(`${serverAddr}/api/operation/task`, {
    method: "GET",
    headers,
  });

  // 서버가 에러면 메시지까지 같이 주기
  const data = await safeJson(response);
  if (!response.ok) {
    const msg = data?.message || "작업 조회 실패";
    throw new Error(msg);
  }

  return data;
}

// (2) 작업 upsert (추가/수정/삭제)
export async function postTasks(tasks, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;

  const response = await fetch(`${serverAddr}/api/operation/task/upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tasks }), // ✅ 기존 코드 유지: { tasks: [...] }
  });

  // 204면 성공 처리(바디 없음)
  if (response.status === 204) return true;

  // 그 외에는 에러 메시지 확인
  const data = await safeJson(response);
  if (!response.ok) {
    const msg = data?.message || "작업 저장 실패";
    throw new Error(msg);
  }

  // 서버가 true/false 등을 내려주면 그걸 쓰고, 아니면 ok로 처리
  return data ?? response.ok;
}

// (3) 작업 엑셀 파싱
export async function parseTaskXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;

  const response = await fetch(`${serverAddr}/api/operation/task/xls`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await safeJson(response);
  if (!response.ok) {
    const msg = data?.message || "엑셀 파싱 실패";
    throw new Error(msg);
  }

  return data;
}
