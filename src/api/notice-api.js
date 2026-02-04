// src/api/notice-api.js
const serverAddr = "http://localhost:8080";

/* =========================
 * (1) 공지 목록 조회
 * ========================= */
export async function getNotices(token) {
  const res = await fetch(`${serverAddr}/api/notice`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });
  return res.json();
}

/* =========================
 * (2) 공지 단건 조회
 * ========================= */
export async function getNoticeById(id, token) {
  const res = await fetch(`${serverAddr}/api/notice/${id}`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });
  return res.json();
}

/* =========================
 * (3) 공지 작성
 * payload: { title, content, memberId, pinned }
 * ========================= */
export async function createNotice(payload, token) {
  const res = await fetch(`${serverAddr}/api/notice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/* =========================
 * (4) 공지 수정  ✅ 이게 없어서 지금 에러난 거!
 * payload: { title, content, memberId, pinned }
 * ========================= */
export async function updateNotice(id, payload, token) {
  const res = await fetch(`${serverAddr}/api/notice/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/* =========================
 * (5) 공지 삭제
 * ========================= */
export async function deleteNotice(id, token) {
  const res = await fetch(`${serverAddr}/api/notice/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });
  return res.json();
}

/* =========================
 * (6) 핀 설정
 * body: { pinned }
 * ========================= */
export async function setNoticePin(id, pinned, token) {
  const res = await fetch(`${serverAddr}/api/notice/${id}/pin`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ pinned }),
  });
  return res.json();
}

/* =========================
 * (7) 엑셀 파싱
 * ========================= */
export async function parseNoticeXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${serverAddr}/api/notice/parse/xls`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: formData,
  });
  return res.json();
}
