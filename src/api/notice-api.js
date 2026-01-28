const serverAddr = "http://localhost:8080";

// (1) 공지 목록 조회
export async function getNotices(token) {
  const response = await fetch(`${serverAddr}/api/notice`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  return response.json();
}

// (2) 공지 단건 조회
export async function getNoticeById(id, token) {
  const response = await fetch(`${serverAddr}/api/notice/${id}`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  return response.json();
}

// (3) 공지 등록/수정
export async function createNotice(payload, token) {
  const response = await fetch(`${serverAddr}/api/notice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  });

  return response.ok;
}

// (4) 공지 삭제
export async function deleteNotices(ids, token) {
  const response = await fetch(`${serverAddr}/api/notice/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ ids }),
  });

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
