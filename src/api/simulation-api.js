// // src/api/simulation-api.js
// const serverAddr = "http://localhost:8080";

// // (1) 시뮬레이션 전체 조회
// export async function getSimulations(token) {
//   return fetch(`${serverAddr}/api/simulation`, {
//     method: "GET",
//     headers: {
//       Authorization: "Bearer " + token,
//     },
//   }).then((r) => r.json());
// }

// // (2) 시뮬레이션 생성
// export async function createSimulation(payload, token) {
//   return fetch(`${serverAddr}/api/simulation`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + token,
//     },
//     body: JSON.stringify(payload),
//   }).then((r) => r.json());
// }

// // (3) 시뮬레이션 실행 요청
// export async function runSimulation(simulationId, token) {
//   return fetch(`${serverAddr}/api/simulation/${simulationId}`, {
//     method: "POST",
//     headers: {
//       Authorization: "Bearer " + token,
//     },
//   }).then((r) => r.json());
// }

// // (4) 시뮬레이션 삭제
// export async function deleteSimulation(simulationId, token) {
//   return fetch(`${serverAddr}/api/simulation/${simulationId}`, {
//     method: "DELETE",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + token,
//     },
//     body: JSON.stringify({}),
//   }).then((r) => r.json());
// }

// // (5) 시뮬레이션 메타데이터(JSON) 조회
// export async function getSimulationMetaJson(simulationId, token) {
//   return fetch(`${serverAddr}/api/simulation/${simulationId}/json`, {
//     method: "GET",
//     headers: {
//       Authorization: "Bearer " + token,
//     },
//   }).then((r) => r.json());
// }

// // (6) 작업 지시(스케줄) 조회
// export async function getSimulationSchedule(simulationId, token) {
//   return fetch(`${serverAddr}/api/simulation/${simulationId}`, {
//     method: "GET",
//     headers: {
//       Authorization: "Bearer " + token,
//     },
//   }).then((r) => r.json());
// }

// // (7) 스케줄 조건 요약(POST)
// export async function postSimulationSummary(
//   simulationScheduleId,
//   payload,
//   token,
// ) {
//   return fetch(`${serverAddr}/api/simulation/${simulationScheduleId}/summary`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + token,
//     },
//     body: JSON.stringify(payload || {}),
//   }).then((r) => r.json());
// }

// // (8) 개인 스케줄 조회
// export async function getPersonalSchedule(token) {
//   const res = await fetch(`${serverAddr}/api/simulation/schedule/personal`, {
//     method: "GET",
//     headers: {
//       Authorization: "Bearer " + token,
//     },
//   });

//   // 에러면 서버 메시지까지 같이 뱉기
//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(`개인 스케줄 조회 실패 (${res.status}) ${text}`.trim());
//   }

//   // 응답이 json이라고 가정(대부분 그럴 것)
//   return res.json();
// }

// src/api/simulation-api.js

const serverAddr = "http://localhost:8080";

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function buildErr(json, fallback) {
  return new Error(json?.message || json?.error || fallback);
}

// (1) 시뮬레이션 전체 조회
// GET /api/simulation?keyword=
export async function getSimulations(token, keyword = "") {
  const url = keyword
    ? `${serverAddr}/api/simulation?keyword=${encodeURIComponent(keyword)}`
    : `${serverAddr}/api/simulation`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);
  if (!res.ok) throw buildErr(json, "시뮬레이션 조회 실패");
  return json;
}

// (2) 시뮬레이션 생성
// POST /api/simulation
export async function createSimulation(payload, token) {
  const res = await fetch(`${serverAddr}/api/simulation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload || {}),
  });

  const json = await safeJson(res);
  if (!res.ok) throw buildErr(json, "시뮬레이션 생성 실패");
  return json;
}

// (3) 시뮬레이션 실행 요청
// POST /api/simulation/{simulationId}
export async function runSimulation(simulationId, token) {
  const res = await fetch(`${serverAddr}/api/simulation/${simulationId}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);
  if (!res.ok) throw buildErr(json, "시뮬레이션 실행 실패");
  return json;
}

// (4) 시뮬레이션 삭제
// DELETE /api/simulation/{simulationId}
//  body 보내지 않음
export async function deleteSimulation(simulationId, token) {
  const res = await fetch(`${serverAddr}/api/simulation/${simulationId}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);
  if (!res.ok) throw buildErr(json, "시뮬레이션 삭제 실패");
  return json;
}

// (5) 시뮬레이션 메타데이터(JSON) 조회
// GET /api/simulation/{simulationId}/json
export async function getSimulationMetaJson(simulationId, token) {
  const res = await fetch(`${serverAddr}/api/simulation/${simulationId}/json`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);
  if (!res.ok) throw buildErr(json, "시뮬레이션 메타 조회 실패");
  return json;
}

// (6) 작업 지시(스케줄) 조회
// GET /api/simulation/{simulationId}
export async function getSimulationSchedule(simulationId, token) {
  const res = await fetch(`${serverAddr}/api/simulation/${simulationId}`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);
  if (!res.ok) throw buildErr(json, "시뮬레이션 스케줄 조회 실패");
  return json;
}

// (7) 개인 스케줄 조회
//  백엔드: GET /api/simulation/schedule/{memberId}
// (현재 컨트롤러가 memberId를 @PathVariable로 안 받지만, URL은 이렇게 맞춰야 404를 피합니다.)
export async function getPersonalSchedule(memberId, token) {
  const mid = (memberId || "").trim() || "me";

  const res = await fetch(`${serverAddr}/api/simulation/schedule/${mid}`, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const json = await safeJson(res);
  if (!res.ok) throw buildErr(json, "개인 스케줄 조회 실패");
  return json;
}
