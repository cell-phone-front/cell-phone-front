const serverAddr = "http://localhost:8080";

// 댓글 작성
export async function postComment(comment, token) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/comment/${communityId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ comment: comment }),
    },
  );
  return response.ok;
}

//댓글 수정
export async function putComment(communityId, commentId, comment, token) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/comment/${communityId}/${commentId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ comment: comment }),
    },
  );
  return response.ok;
}

// 댓글 삭제
export async function deleteComment(communityId, commentId, token) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/comment/${communityId}/${commentId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
      },
    },
  );
  return response.ok;
}

// 댓글전체 목록 조회(검색)
export async function getCommentAll(token) {
  const response = await fetch(`${serverAddr}/api/comment/${communityId}`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });
  return response.json();
}
