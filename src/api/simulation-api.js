// src/api/simulation-api.js
const serverAddr = "http://localhost:8080";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function authHeaders(token, extra) {
  const h = { ...(extra || {}) };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

/**
 * (1) 시뮬레이션 전체 조회
 */
export async function getSimulations(token) {
  const res = await fetch(`${serverAddr}/api/simulation`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || "시뮬레이션 목록 조회 실패";
    throw new Error(msg);
  }
  return data;
}

/**
 * (2) 시뮬레이션 생성
 */
export async function createSimulation(payload, token) {
  const res = await fetch(`${serverAddr}/api/simulation`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || "시뮬레이션 생성 실패";
    throw new Error(msg);
  }
  return data;
}

/**
 * (3) 시뮬레이션 실행 요청
 */
export async function runSimulation(simulationId, token) {
  const res = await fetch(`${serverAddr}/api/simulation/${simulationId}`, {
    method: "POST",
    headers: authHeaders(token),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || "시뮬레이션 실행 요청 실패";
    throw new Error(msg);
  }
  return data;
}

/**
 * (4) 시뮬레이션 삭제
 * DELETE /api/simulation/{simulationId}
 *
 * ⚠️ 스프링에서 "Required request body is missing" 터지는 경우가 있어서
 * - 백엔드가 body 요구하면 body에 {}를 넣어주면 해결되는 경우 많음
 * - 그래서 안전하게 Content-Type + body:{} 포함
 */
export async function deleteSimulation(simulationId, token) {
  const res = await fetch(`${serverAddr}/api/simulation/${simulationId}`, {
    method: "DELETE",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || "시뮬레이션 삭제 실패";
    throw new Error(msg);
  }
  return data;
}

/**
 * (5) 시뮬레이션 메타데이터(확인용 JSON) 조회
 */
export async function getSimulationMetaJson(simulationId, token) {
  const res = await fetch(`${serverAddr}/api/simulation/${simulationId}/json`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || "시뮬레이션 JSON 조회 실패";
    throw new Error(msg);
  }
  return data;
}

/**
 * (6) 작업 지시(스케줄) 조회
 */
export async function getSimulationSchedule(simulationScheduleId, token) {
  const res = await fetch(
    `${serverAddr}/api/simulation/${simulationScheduleId}`,
    {
      method: "GET",
      headers: authHeaders(token),
    },
  );

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || "작업지시(스케줄) 조회 실패";
    throw new Error(msg);
  }
  return data;
}

/**
 * (7) 스케줄 조건 요약
 */
export async function postSimulationSummary(
  simulationScheduleId,
  payload,
  token,
) {
  const res = await fetch(
    `${serverAddr}/api/simulation/${simulationScheduleId}/summary`,
    {
      method: "POST",
      headers: authHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload || {}),
    },
  );

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.message || "스케줄 요약/조건 생성 실패";
    throw new Error(msg);
  }
  return data;
}
