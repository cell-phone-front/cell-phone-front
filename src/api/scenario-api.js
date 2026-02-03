// src/api/scenario-api.js
const serverAddr = "http://localhost:8080";

// 시나리오 전체 조회
export async function getScenarios(token) {
  return fetch(`${serverAddr}/api/scenarios`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// 시나리오 생성
// payload 예: { description: "...", jobCount: 10 }
export async function createScenario(payload, token) {
  return fetch(`${serverAddr}/api/scenarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  }).then((r) => r.json());
}

// 시뮬레이션 실행
export async function simulateScenario(scenarioId, token) {
  return fetch(`${serverAddr}/api/scenarios/${scenarioId}/simulate`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// (선택) 시나리오 삭제
export async function deleteScenario(scenarioId, token) {
  return fetch(`${serverAddr}/api/scenarios/${scenarioId}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}
