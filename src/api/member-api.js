const serverAddr = "http://54.180.121.234:8080";

// (1) 로그인
export async function loginCheck(name, id) {
  const response = await fetch(`${serverAddr}/api/member/login`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ name, id }),
  });
  return response.json();
}

// (2) 전체 멤버 조회 (관리자 페이지 → 토큰 필요)
export async function getMembers(token) {
  const response = await fetch(`${serverAddr}/api/member`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });
  return response.json();
}

// (3) 멤버 upsert
export async function postMembers(members, token) {
  const response = await fetch(`${serverAddr}/api/member/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      memberList: members,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("postMembers fail:", response.status, text);
  }

  return response.ok;
}

// (4) 엑셀 파싱
export async function parseMemberXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${serverAddr}/api/member/parse/xls`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
    body: formData,
  });

  return response.json();
}
