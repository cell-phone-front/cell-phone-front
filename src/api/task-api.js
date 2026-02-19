// src/api/task-api.js
const serverAddr = "http://54.180.121.234:8080";

// 작업 목록 조회 + 검색
export async function getTasks(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/operation/task?keyword=${keyword}`
    : `${serverAddr}/api/operation/task`;

  return fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// 작업 upsert
export async function postTasks(taskList, token) {
  const res = await fetch(`${serverAddr}/api/operation/task/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ taskList }),
  });

  return res.ok;
}

// 작업 엑셀 파싱
export async function parseTaskXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${serverAddr}/api/operation/task/xls`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
    body: formData,
  });

  const json = await res.json().catch(() => null);
  // console.log("[parseTaskXLS raw response]", json);
  if (!res.ok) throw new Error(json?.message || "XLS 파싱 실패");

  return json;
}
