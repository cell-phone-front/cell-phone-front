const serverAddr = "http://localhost:8080";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// (1) 커뮤니티 글 전체 조회 (Auth: all)
export async function getCommunities(token) {
  const response = await fetch(`${serverAddr}/api/community`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  return response.json();
}

// (2) 커뮤니티 글 상세 조회 (Auth: all)
export async function getCommunityById(communityId, token) {
  const response = await fetch(`${serverAddr}/api/community/${communityId}`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  return response.json();
}

// (3) 커뮤니티 글 작성 (Auth: planner, worker)  body: { title, description }
export async function postCommunity(payload, token) {
  const response = await fetch(`${serverAddr}/api/community`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload), // { title, description }
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || "커뮤니티 글 작성 실패");
  }
  return data; // 서버가 주는 응답이 없으면 null일 수 있음
}

// (4) 커뮤니티 글 수정 (Auth: planner, worker)  body: { title, description }
export async function putCommunity(communityId, payload, token) {
  const response = await fetch(`${serverAddr}/api/community/${communityId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload), // { title, description }
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || "커뮤니티 글 수정 실패");
  }
  return data;
}

// (5) 커뮤니티 글 삭제 (Auth: planner, worker)
export async function deleteCommunity(communityId, token) {
  const response = await fetch(`${serverAddr}/api/community/${communityId}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || "커뮤니티 글 삭제 실패");
  }
  return true;
}

// (6) 댓글 수 조회 (Auth: all)
export async function getCommunityCommentCount(communityId, token) {
  const response = await fetch(
    `${serverAddr}/api/community/${communityId}/comment-count`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    },
  );

  return response.json();
}

