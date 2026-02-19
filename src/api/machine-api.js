// src/api/machine-api.js
const serverAddr = "http://54.180.121.234:8080";

// (1) 기계 전체 조회
export async function getMachine(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/operation/machine?keyword=${keyword}`
    : `${serverAddr}/api/operation/machine`;

  return fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// (2) 기계 upsert (추가/수정/삭제)
export async function postMachine(machineList, token) {
  return fetch(`${serverAddr}/api/operation/machine/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      machineList: machineList,
    }),
  });
}

// (3) 기계 엑셀 파싱
export async function parseMachineXLS(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  return fetch(`${serverAddr}/api/operation/machine/xls`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
    body: formData,
  }).then((r) => r.json());
}
