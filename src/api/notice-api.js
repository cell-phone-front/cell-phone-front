// src/api/notice-api.js
const serverAddr = "http://localhost:8080";

/* =========================
 * (1) 공지 목록 조회
 * ========================= */
export async function getNotices(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/notice?keyword=${encodeURIComponent(keyword)}`
    : `${serverAddr}/api/notice`;

  return fetch(url, {
    headers: { Authorization: "Bearer " + token },
  }).then((r) => r.json());
}

/* =========================
 * (2) 공지 단건 조회
 * ========================= */
export async function getNoticeById(id, token) {
  return fetch(`${serverAddr}/api/notice/${id}`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  }).then((r) => r.json());
}

/* =========================
 * (3) 공지 작성
 * ========================= */
export async function createNotice(payload, token) {
  return fetch(`${serverAddr}/api/notice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  }).then((r) => r.json());
}

/* =========================
 * (4) 공지 수정
 * ========================= */
// export async function updateNotice(id, payload, token) {
//   return fetch(`${serverAddr}/api/notice/${id}`, {
//     method: "PUT",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + token,
//     },
//     body: JSON.stringify(payload),
//   }).then((r) => r.json());
// }

export async function updateNotice(id, payload, files = [], token) {
  const formData = new FormData();

  // ✅ JSON 데이터
  formData.append(
    "request",
    new Blob([JSON.stringify(payload)], {
      type: "application/json",
    }),
  );

  // 파일 데이터
  (files || []).forEach((file) => {
    formData.append("files", file);
  });

  return fetch(`${serverAddr}/api/notice/${id}`, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      // ❗ Content-Type 넣지 마세요
    },
    body: formData,
  }).then(async (r) => {
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`수정 실패 (${r.status}) ${text}`.trim());
    }

    const ct = r.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      return r.json();
    }

    return true;
  });
}

/* =========================
 * (5) 공지 삭제
 *  - operation-api처럼 "fetch만 반환"으로 통일하면 호출부에서 ok 체크가 필요해져서
 *    여기서는 기존처럼 ok 체크 + 응답 파싱을 유지합니다.
 * ========================= */
export async function deleteNotice(id, token) {
  const res = await fetch(`${serverAddr}/api/notice/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(`삭제 실패 (${res.status}) ${text || ""}`.trim());
  }

  try {
    return text ? JSON.parse(text) : true;
  } catch {
    return true;
  }
}

/* =========================
 * (6) 핀 설정
 * ========================= */
export async function setNoticePin(id, pinned, token) {
  return fetch(`${serverAddr}/api/notice/${id}/pin`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ pinned, isPinned: pinned }),
  }).then((r) => r.json());
}

/* =========================
 * (7) 공지 파일 첨부
 * ========================= */
export async function uploadNoticeFiles(noticeId, files = [], token) {
  if (!noticeId) throw new Error("noticeId is required");
  if (!token) throw new Error("token is required");
  if (!files || files.length === 0) return;

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${serverAddr}/api/notice/${noticeId}/attachment`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: formData,
  });

  if (!res.ok) throw new Error(`파일 업로드 실패 (${res.status})`);

  // 응답이 json일 수도/텍스트일 수도 있어서 안전 처리
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// (8) 공지 첨부파일 다운로드
function extractFileNameFromCD(cd) {
  if (!cd) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^\";]+)\"?/i.exec(cd);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**

 *
 * fileObj: { id, url, name } 형태(지금 normalizeFiles 결과)
 */
export async function downloadNoticeAttachment(noticeId, file, token) {
  if (!token) throw new Error("token is required");
  if (noticeId == null) throw new Error("noticeId is required");
  if (!file) throw new Error("file is required");

  // 백엔드가 path로 받는 noticeAttachmentId 후보
  const attachmentId = file?.id ?? file?.url;
  if (attachmentId == null || attachmentId === "") {
    throw new Error("첨부파일 id/url이 없습니다.");
  }

  const url = `${serverAddr}/api/notice/${encodeURIComponent(
    String(noticeId),
  )}/attachment/${encodeURIComponent(String(attachmentId))}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`다운로드 실패 (${res.status}) ${text}`.trim());
  }

  const blob = await res.blob();

  const cd = res.headers.get("content-disposition");
  const nameFromHeader = extractFileNameFromCD(cd);

  // header 없으면 프론트에서 가지고 있는 원래 파일명 사용
  const filename = nameFromHeader || file?.name || `notice-${noticeId}-file`;

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

/* =========================
 * (9) 공지 알림 조회
 * ========================= */
export async function getNoticeNotifications(token) {
  if (!token) throw new Error("token is required");

  return fetch(`${serverAddr}/api/notice/notification`, {
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

export async function deleteNoticeAttachment(noticeId, attachmentId, token) {
  const res = await fetch(`${serverAddr}/api/notice/${noticeId}}`, {
    method: "PUT",
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error(`첨부 삭제 실패 (${res.status})`);
  return true;
}
