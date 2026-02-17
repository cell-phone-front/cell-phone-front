const serverAddr = "http://3.36.47.128:8080";

// member
// 로그인체크
function loginCheck(name, id) {
  return fetch(serverAddr + "/api/member/login", {
    method: "POST",
    body: JSON.stringify({ name, id }),
    headers: {
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 아이디
function idCheck(id) {
  return fetch(serverAddr + "/validate/id?id=" + id, {
    method: "get",
  }).then(function (response) {
    return response.json();
  });
}
// 이메일
function emailCheck(email) {
  return fetch(serverAddr + "/validate/email?email=" + email, {
    method: "get",
  }).then(function (response) {
    return response.json();
  });
}

function emailCodeCheck(email) {
  const data = { email };
  return fetch(serverAddr + "/validate/code", {
    method: "post",
    body: JSON.stringify(data),
    headers: {
      "Content-type": "application/json",
    },
  }).then(function (response) {
    return response.json();
  });
}

function insertAccount(data) {
  return fetch(serverAddr + "/accounts/register", {
    method: "post",
    body: JSON.stringify(data),
    headers: {
      "Content-type": "application/json",
    },
  }).then(function (response) {
    return response.json();
  });
}

// function loginCheck(accountId, pw) {
//   return fetch(serverAddr + "/accounts/login", {
//     method: "post",
//     body: JSON.stringify({
//       accountId: accountId,
//       pw: pw,
//     }),
//     headers: {
//       "Content-type": "application/json",
//     },
//   }).then((res) => res.json());
// }

function searchAccommodation(data) {
  const addr = `${serverAddr}/accommodations?destination=${data.destination}&checkInDate=${data.checkInDate}&checkOutDate=${data.checkOutDate}&guests=${data.guests}`;
  return fetch(addr, {
    method: "get",
    headers: {
      "Content-type": "application/json",
    },
  }).then((response) => response.json());
}

function createAccommodation(data, token) {
  return fetch(serverAddr + "/accommodations", {
    method: "post",
    body: JSON.stringify(data),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((response) => response.json());
}

function createImages(accommodationId, data, token) {
  if (!Array.isArray(data) || data.length === 0) {
    return Promise.resolve({ success: true, message: "no images" });
  }

  const formData = new FormData();
  data.forEach((file) => {
    formData.append("images", file);
  });

  return fetch(`${serverAddr}/accommodations/${accommodationId}/images`, {
    method: "POST",
    body: formData,
    headers: {
      Token: token,
    },
  }).then((response) => response.json());
}

function createTags(accommodationId, data, token) {
  const tag = {
    tags: [...data],
  };
  return fetch(`${serverAddr}/accommodations/${accommodationId}/tags`, {
    method: "post",
    body: JSON.stringify(tag),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((response) => response.json());
}

function createAmenities(accommodationId, data, token) {
  const amenity = {
    amenities: [...data],
  };
  return fetch(`${serverAddr}/accommodations/${accommodationId}/amenities`, {
    method: "post",
    body: JSON.stringify(amenity),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((response) => response.json());
}

function getDetailAccommodation(accommodationId) {
  return fetch(`${serverAddr}/accommodations/${accommodationId}`, {
    method: "get",
    headers: {
      "Content-type": "application/json",
    },
  }).then((response) => response.json());
}

function createReservation(data, token) {
  return fetch(`${serverAddr}/reservations`, {
    method: "post",
    body: JSON.stringify(data),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((response) => response.json());
}

function checkReservation({
  accommodationId,
  accountId,
  visitors,
  startDate,
  endDate,
}) {
  const addr = `${serverAddr}/validate/reservation?accommodationId=${accommodationId}&accountId=${accountId}&visitors=${visitors}&startDate=${startDate}&endDate=${endDate}`;
  return fetch(addr, {
    method: "get",
    headers: {
      "Content-type": "application/json",
    },
  }).then((response) => response.json());
}

function getAccommodationReview(accommodationId) {
  return fetch(`${serverAddr}/accommodations/${accommodationId}/reviews`, {
    method: "get",
    headers: {
      "Content-type": "application/json",
    },
  }).then((response) => response.json());
}

// 메시지 작성
function createMessage(data, token) {
  return fetch(serverAddr + "/reservations/messages", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 메시지 삭제
function deleteMessage(messageId, token) {
  return fetch(`${serverAddr}/reservations/messages/${messageId}`, {
    method: "DELETE",
    headers: {
      Token: token,
    },
  }).then((res) => res.json());
}

// 메시지 조회
function getMessage(reservationCode, token) {
  return fetch(`${serverAddr}/reservations/message/${reservationCode}`, {
    method: "GET",
    headers: {
      Token: token,
    },
  }).then((res) => res.json());
}

function getMyMessageList(accountId, token) {
  return fetch(`${serverAddr}/reservations/messages/list/${accountId}`, {
    method: "GET",
    headers: {
      Token: token,
    },
  }).then((res) => res.json());
}

// 회원정보수정
function updateAccountProfile(accountId, data, token) {
  return fetch(`${serverAddr}/accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}
// 비밀번호 변경
function updateAccountPassword(accountId, data, token) {
  return fetch(`${serverAddr}/accounts/${accountId}/password`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 회원탈퇴
function deleteAccount(accountId, token) {
  return fetch(`${serverAddr}/accounts/${accountId}`, {
    method: "DELETE",
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

function getMyHosting(accountId) {
  return fetch(`${serverAddr}/accommodations/${accountId}/hosting`, {
    method: "GET",
  }).then((res) => res.json());
}

function getReservation(code, token) {
  return fetch(`${serverAddr}/reservations/${code}`, {
    method: "GET",
    headers: {
      Token: token,
    },
  }).then((res) => res.json());
}

function createReview(data, token, reservationCode) {
  return fetch(`${serverAddr}/reservations/${reservationCode}/reviews`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 좋아요 등록
function likeAccommodation(accommodationId, accountId, token) {
  return fetch(`${serverAddr}/accommodations/${accommodationId}/likes`, {
    method: "POST",
    body: JSON.stringify({ accountId: accountId }),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 좋아요 삭제
function unlikeAccommodation(accommodationId, accountId, token) {
  return fetch(`${serverAddr}/accommodations/${accommodationId}/likes`, {
    method: "DELETE",
    body: JSON.stringify({ accountId: accountId }),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 아이디별 좋아요 목록 조회
function getLikedAccommodationList(accountId, token) {
  return fetch(`${serverAddr}/accommodations/${accountId}/likes/list`, {
    method: "GET",
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

function getAccommodationStatsInfo() {
  return fetch(`${serverAddr}/accommodations/stats-info`, {
    method: "GET",
  }).then((res) => res.json());
}

// 예약 기록 전체 조회
function getMyReservations(accountId, token) {
  return fetch(`${serverAddr}/reservations/${accountId}/history`, {
    method: "GET",
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 예약 수정
function updateReservation(code, payload, token) {
  return fetch(`${serverAddr}/reservations/${code}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 예약 삭제
function deleteReservation(code, token) {
  return fetch(`${serverAddr}/reservations/${code}`, {
    method: "DELETE",
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

//숙소 수정
function updateAccommodation(data, accommodationId, token) {
  return fetch(`${serverAddr}/accommodations/${accommodationId}`, {
    method: "put",
    body: JSON.stringify(data),
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

// 숙소 삭제
function deleteAccommodation(accommodationId, token) {
  return fetch(`${serverAddr}/accommodations/${accommodationId}`, {
    method: "DELETE",
    headers: {
      Token: token,
      "Content-type": "application/json",
    },
  }).then((res) => res.json());
}

function countMyReview(accountId, reservationCode, token) {
  return fetch(
    `${serverAddr}/reservations/review/count?accountId=${accountId}&reservationCode=${reservationCode}`,
    {
      method: "GET",
      headers: {
        Token: token,
      },
    },
  ).then((res) => res.json());
}

export {
  idCheck,
  emailCheck,
  emailCodeCheck,
  loginCheck,
  insertAccount,
  createAccommodation,
  searchAccommodation,
  createImages,
  createTags,
  createAmenities,
  createMessage,
  deleteMessage,
  getMessage,
  getDetailAccommodation,
  checkReservation,
  createReservation,
  getAccommodationReview,
  getMyMessageList,
  updateAccountProfile,
  updateAccountPassword,
  deleteAccount,
  getMyHosting,
  getReservation,
  createReview,
  likeAccommodation,
  unlikeAccommodation,
  getLikedAccommodationList,
  getAccommodationStatsInfo,
  updateAccommodation,
  deleteAccommodation,
  updateReservation,
  deleteReservation,
  getMyReservations,
  countMyReview,
};
