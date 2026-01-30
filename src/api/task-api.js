const serverAddr = "http://localhost:8080";

export async function getTasks(token) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(`${serverAddr}/api/operation/task`, { headers });
  return res.json();
}

export async function postTasks(tasks, token) {
  const res = await fetch(`${serverAddr}/api/operation/task/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify({ tasks }),
  });
  return res.ok;
}

export async function parseTaskXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${serverAddr}/api/operation/task/xls`, {
    method: "POST",
    headers: token ? { Authorization: "Bearer " + token } : undefined,
    body: formData,
  });

  // 엑셀 파싱 실패 시도 대비
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || "XLS 파싱 실패");
  return json;
}
