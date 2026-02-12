const serverAddr = "http://localhost:8080";

export async function searchDashboard(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/dashboard/search?keyword=${keyword}`
    : `${serverAddr}/api/dashboard/search`;

  return fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}
