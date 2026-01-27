const serverAddr = "http://localhost:8080";

// 공지사항 작성
export async function postNotice(notice, token) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/notice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ notice: notice }),
    },
  );
  return response.ok;
}

//공지사항 수정
export async function putNotice(noticeId, notice, token) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/notice/${noticeId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ notice: notice }),
    },
  );
  return response.ok;
}

// 공지사항 삭제
export async function deleteNotice(notice) {
  const response = await fetch(
    `http://${process.env.NEXT_PUBLIC_APS_SERVER}:8080/api/notice/${noticeId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
      },
    },
  );
  return response.ok;
}

// 해당 공지사항 상세 조회
export async function getNoticeDetail(noticeId, token) {
  const response = await fetch(`${serverAddr}/api/notice/${noticeId}`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });
  return response.json();
}

// 공지사항 전체 목록 조회(검색)
export async function getNoticeAll(token) {
  const response = await fetch(`${serverAddr}/api/notice`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });
  return response.json();
}
