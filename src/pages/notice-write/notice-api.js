// src/api/notice-api.js
import axios from "axios";
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

// (7) 공지사항 파일 첨부
export const uploadNoticeFiles = async (noticeId, files = [], token) => {
  if (!noticeId) throw new Error("noticeId is required for upload");

  // 후보 엔드포인트들: 백 구현에 따라 attachment(s) 등으로 갈릴 수 있으니 순차 시도
  const endpoints = [
    `${serverAddr}/api/notice/${noticeId}/attachment`,
    `${serverAddr}/api/notice/${noticeId}/attachments`,
    `${serverAddr}/api/notice/attachment/${noticeId}`,
  ];

  const fieldNames = ["files", "file", "attachments", "attachment"];

  let lastErr = null;

  // 시도 루프: 각 엔드포인트마다 여러 필드 이름으로 FormData를 만들어서 전송 시도
  for (const url of endpoints) {
    for (const field of fieldNames) {
      try {
        const fd = new FormData();
        // 여러 파일일 수도 있으니 배열로 append
        files.forEach((file) => fd.append(field, file));

        // axios will set proper multipart headers automatically when FormData is passed
        const res = await axios.post(url, fd, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        // 성공 시 리턴
        return res.data;
      } catch (err) {
        lastErr = err;
        const status = err?.response?.status;
        // 404이면 경로가 없다는 의미 -> 다음 엔드포인트로
        if (status === 404) {
          // eslint-disable-next-line no-console
          console.warn(
            `[uploadNoticeFiles] 404 for ${url} (field=${field}), trying next candidate`,
          );
          // break inner loop to try next endpoint? No, try other field names first
          continue;
        }
        // 400 등은 필드명 문제일 수 있으므로 다음 field로 계속 시도
        if (status >= 400 && status < 500) {
          // eslint-disable-next-line no-console
          console.warn(
            `[uploadNoticeFiles] ${status} for ${url} (field=${field}), trying next field`,
          );
          continue;
        }
        // 그 외(서버 에러 등)은 바로 throw
        throw err;
      }
    }
  }

  // 모든 후보 실패
  throw lastErr || new Error("file upload failed");
};
