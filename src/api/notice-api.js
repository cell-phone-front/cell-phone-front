// src/api/notice-api.js
import axios from "axios";
const serverAddr = "http://localhost:8080";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// (1) 공지 목록 조회
export async function getNotices(token) {
  const res = await fetch(`${serverAddr}/api/notice`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);

  // "없습니다"를 400으로 주는 백엔드 대응
  if (!res.ok) {
    const msg = json?.message || "공지 목록 조회 실패";
    if (String(msg).includes("없습니다")) return [];
    throw new Error(msg);
  }

  return json;
}

// (2) 공지 단건 조회
export async function getNoticeById(id, token) {
  const res = await fetch(`${serverAddr}/api/notice/${id}`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.message || "공지 상세 조회 실패");
  return json;
}

// (3) 공지 작성
export async function createNotice(payload, token) {
  const res = await fetch(`${serverAddr}/api/notice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  });

  const json = await safeJson(res);

  if (!res.ok) {
    throw new Error(json?.message || `공지 저장 실패 (${res.status})`);
  }

  // 서버가 바디 없이 204 줄 수도 있어서 true fallback
  return json ?? true;
}

// (4) 공지 삭제
export async function deleteNotices(ids, token) {
  const res = await fetch(`${serverAddr}/api/notice/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ ids }),
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.message || "공지 삭제 실패");
  return true;
}

// (5) 엑셀 파싱
export async function parseNoticeXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${serverAddr}/api/notice/parse/xls`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: formData,
  });

  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.message || "엑셀 파싱 실패");
  return json;
}

// (6) 핀 토글
export async function toggleNoticePin(noticeId, token) {
  const res = await fetch(`${serverAddr}/api/notice/${noticeId}/pin`, {
    method: "PATCH",
    headers: { Authorization: "Bearer " + token },
  });

  // 204 / json 모두 대응
  if (!res.ok) {
    const json = await safeJson(res);
    throw new Error(json?.message || "핀 고정 실패");
  }

  const json = await safeJson(res);
  return json ?? true;
}

// (7) 공지사항 파일 첨부
export const uploadNoticeFiles = async (noticeId, files, token) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const res = await axios.post(`/api/notice/${noticeId}/attachment`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};
