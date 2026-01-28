const serverAddr = "http://localhost:8080";

// (1) 공지 목록 조회 (보통 공개 / 필요하면 토큰 붙이면 됨)
export async function getNotices(token) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;

  const response = await fetch(`${serverAddr}/api/notice`, {
    method: "GET",
    headers,
  });

  return response.json();
}

// (2) 공지 단건 조회 (상세 모달 열 때)
export async function getNoticeById(id, token) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;

  const response = await fetch(`${serverAddr}/api/notice/${id}`, {
    method: "GET",
    headers,
  });

  return response.json();
}

// (3) 공지 upsert (등록/수정) - 관리자 페이지 → 토큰 필요
export async function createNotice(payload, token) {
  const response = await fetch(`${serverAddr}/api/notice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("createNotice fail:", response.status, text);
    return null;
  }

  return response.json();
}

// (4) 공지 삭제 (선택 삭제 같은 거)
export async function deleteNotices(ids, token) {
  const response = await fetch(`${serverAddr}/api/notice/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("deleteNotices fail:", response.status, text);
  }

  return response.ok;
}

// (5) 엑셀 파싱
export async function parseNoticeXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${serverAddr}/api/notice/parse/xls`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
    body: formData,
  });

  return response.json();
}
