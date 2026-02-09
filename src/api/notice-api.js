const host =
  typeof window !== "undefined" ? window.location.hostname : "localhost";
const serverAddr = `http://${host}:8080`;

/* =========================
 * (1) 공지 목록 조회
 * ========================= */
export async function getNotices(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/notice?keyword=${encodeURIComponent(keyword)}`
    : `${serverAddr}/api/notice`;

  const res = await fetch(url, {
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
 * (4) 공지 수정
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

  const text = await res.text(); // 서버가 주는 에러 메시지 확인용

  if (!res.ok) {
    throw new Error(`삭제 실패 (${res.status}) ${text || ""}`.trim());
  }

  // 서버가 json 주면 파싱, 아니면 true 반환
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
  const res = await fetch(`${serverAddr}/api/notice/${id}/pin`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ pinned, isPinned: pinned }),
  });
  return res.json();
}

/* =========================
 * (7) 공지 파일 첨부 (axios -> fetch)
 * ========================= */
export async function uploadNoticeFiles(noticeId, files = [], token) {
  noticeId ||
    (() => {
      throw new Error("noticeId is required");
    })();
  token ||
    (() => {
      throw new Error("token is required");
    })();

  if (!files || files.length === 0) return;

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file)); // 서버가 files 기대

  const res = await fetch(`${serverAddr}/api/notice/${noticeId}/attachment`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      // ⚠️ Content-Type 직접 지정하지 마세요. fetch가 boundary 포함해서 자동으로 넣습니다.
    },
    body: formData,
  });

  res.ok ||
    (() => {
      throw new Error(`파일 업로드 실패 (${res.status})`);
    })();

  // 서버 응답이 json일 수도/아닐 수도 있어서 안전 처리
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

/* =========================
 * (8) 공지 첨부파일 다운로드 (fetch)
 * ========================= */
export async function downloadNoticeAttachment(noticeId, attachmentId, token) {
  const url = `${serverAddr}/api/notice/${noticeId}/attachment/${attachmentId}`;

  console.log("[DOWNLOAD] url =", url);
  console.log("[DOWNLOAD] ids =", { noticeId, attachmentId });
  console.log("[DOWNLOAD] token?", Boolean(token));

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[DOWNLOAD] status:", res.status, "body:", text);
    throw new Error(`다운로드 실패 (${res.status}) ${text || ""}`.trim());
  }

  // 아래는 그대로
  const cd = res.headers.get("content-disposition") || "";
  const match =
    cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ? decodeURIComponent(match[1]) : "attachment";

  const blob = await res.blob();
  const a = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);

  return true;
}
