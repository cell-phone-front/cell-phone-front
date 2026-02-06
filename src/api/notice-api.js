// src/api/notice-api.js
import axios from "axios";
const serverAddr = "http://localhost:8080";

/* =========================
 * (1) 공지 목록 조회
 * ========================= */
export async function getNotices(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/notice?keyword=${encodeURIComponent(keyword)}`
    : `${serverAddr}/api/notice`;

  return fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
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

// (7) 공지사항 파일 첨부
// (7) 공지사항 파일 첨부
export const uploadNoticeFiles = async (noticeId, files = [], token) => {
  if (!noticeId) throw new Error("noticeId is required");
  if (!files || files.length === 0) return;

  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file); // 🔥 반드시 "files"
  });

  const res = await axios.post(
    `${serverAddr}/api/notice/${noticeId}/attachment`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
};
