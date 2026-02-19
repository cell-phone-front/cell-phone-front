const serverAddr = "http://54.180.121.234:8080";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// 댓글 작성: POST /api/comment/{communityId}  body: { content }
export async function postComment(communityId, content, token) {
  const response = await fetch(`${serverAddr}/api/comment/${communityId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ content }),
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || `댓글 작성 실패 (${response.status})`);
  }
  return data;
}

// 댓글 수정: PUT /api/comment/{communityId}/{commentId}  body: { content }
export async function putComment(communityId, commentId, content, token) {
  const response = await fetch(
    `${serverAddr}/api/comment/${communityId}/${commentId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ content }),
    },
  );

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || `댓글 수정 실패 (${response.status})`);
  }
  return data;
}

// 댓글 삭제: DELETE /api/comment/{communityId}/{commentId}
export async function deleteComment(communityId, commentId, token) {
  const response = await fetch(
    `${serverAddr}/api/comment/${communityId}/${commentId}`,
    {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    },
  );

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || `댓글 삭제 실패 (${response.status})`);
  }
  return true;
}

// 댓글 전체 조회: GET /api/comment/{communityId}
export async function getCommentAll(communityId, token) {
  const response = await fetch(`${serverAddr}/api/comment/${communityId}`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || `댓글 조회 실패 (${response.status})`);
  }
  return data;
}
