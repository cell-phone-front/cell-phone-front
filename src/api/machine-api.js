// src/api/machine-api.js
const serverAddr = "http://localhost:8080";

// (1) 기계 전체 조회
export async function getMachine() {
  const response = await fetch(`${serverAddr}/api/operation/machine`);
  return response.json(); // { machineList: [...] }
}

// (2) 기계 upsert (추가/수정/삭제)
export async function postMachine(machineList) {
  const response = await fetch(`${serverAddr}/api/operation/machine/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      machineList: machineList, 
    }),
  });

  return response.ok; // 200 OK
}

// (3) 기계 엑셀 파싱
export async function parseXLS(file) {
  const formData = new FormData();
  formData.append("operationFile", file); // ✅ 이전 에러 기준 확정

  const response = await fetch(`${serverAddr}/api/operation/machine/xls`, {
    method: "POST",
    body: formData,
  });

  return response.json(); 
}
