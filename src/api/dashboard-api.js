const serverAddr = "http://3.36.47.128:8080";

export async function searchDashboard(token, keyword = "") {
  if (!token) throw new Error("token is required");

  const qs = new URLSearchParams();
  const kw = String(keyword || "").trim();
  if (kw) qs.set("keyword", kw);

  const url = `${serverAddr}/api/dashboard/search?${qs.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`대시보드 검색 실패 (${res.status}) ${text}`.trim());
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}
