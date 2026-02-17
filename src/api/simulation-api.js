// src/api/simulation-api.js
const serverAddr = "http://3.36.47.128:8080";

// (1) 시뮬레이션 전체 조회
export async function getSimulations(token) {
  return fetch(`${serverAddr}/api/simulation`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// (2) 시뮬레이션 생성
export async function createSimulation(payload, token) {
  return fetch(`${serverAddr}/api/simulation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  }).then((r) => r.json());
}

// (3) 시뮬레이션 실행 요청
export async function runSimulation(simulationId, token) {
  return fetch(`${serverAddr}/api/simulation/${simulationId}`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// (4) 시뮬레이션 삭제
export async function deleteSimulation(simulationId, token) {
  return fetch(`${serverAddr}/api/simulation/${simulationId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({}),
  }).then((r) => r.json());
}

// (5) 시뮬레이션 메타데이터(JSON) 조회
export async function getSimulationMetaJson(simulationId, token) {
  return fetch(`${serverAddr}/api/simulation/${simulationId}/json`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// (6) 작업 지시(스케줄) 조회
export async function getSimulationSchedule(simulationId, token) {
  return fetch(`${serverAddr}/api/simulation/${simulationId}`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  }).then((r) => r.json());
}

// (7) 스케줄 조건 요약(POST)
export async function postSimulationSummary(
  simulationScheduleId,
  payload,
  token,
) {
  return fetch(`${serverAddr}/api/simulation/${simulationScheduleId}/summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload || {}),
  }).then((r) => r.json());
}

// (8) 개인 스케줄 조회
export async function getPersonalSchedule(token) {
  const res = await fetch(`${serverAddr}/api/simulation/schedule/personal`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  // 에러면 서버 메시지까지 같이 뱉기
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`개인 스케줄 조회 실패 (${res.status}) ${text}`.trim());
  }

  // 응답이 json이라고 가정(대부분 그럴 것)
  return res.json();
}
