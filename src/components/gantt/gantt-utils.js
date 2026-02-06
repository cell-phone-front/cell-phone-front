// src/components/gantt/gantt-utils.js

export const pad2 = (n) => String(n).padStart(2, "0");

export const toDate = (d) => {
  if (d instanceof Date) return d;
  if (d == null) return new Date(NaN);

  let s = String(d).trim();

  // 1) "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
  if (s.includes(" ") && !s.includes("T")) {
    s = s.replace(" ", "T");
  }

  // 2) timezone이 없으면 한국시간으로 붙이기(+09:00)
  //    (Z 또는 +hh:mm / -hh:mm 있으면 그대로 둠)
  const hasTZ = /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
  if (!hasTZ) {
    s = `${s}+09:00`;
  }

  return new Date(s);
};

export const fmtHM = (d) => {
  const dt = toDate(d);
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
};

export const dayKey = (d) => {
  const dt = toDate(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};

export const toMs = (d) => toDate(d).getTime();

export const floorToStep = (date, minutes) => {
  const ms = new Date(date).getTime();
  const stepMs = minutes * 60 * 1000;
  return new Date(Math.floor(ms / stepMs) * stepMs);
};

export const ceilToStep = (date, minutes) => {
  const ms = new Date(date).getTime();
  const stepMs = minutes * 60 * 1000;
  return new Date(Math.ceil(ms / stepMs) * stepMs);
};

export const buildTicks = (start, end, stepMin) => {
  const stepMs = stepMin * 60 * 1000;
  const out = [];
  for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
    out.push(new Date(t));
  }
  return out;
};

export const calcBar = ({
  task,
  rangeStart,
  stepMinutes,
  colWidth,
  gridWidthPx,
}) => {
  const s = toMs(task.startAt);
  const e = toMs(task.endAt);

  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
    return { left: 0, width: 0 };
  }

  const pxPerMinute = colWidth / stepMinutes;

  const rawLeft = ((s - rangeStart.getTime()) / 60000) * pxPerMinute;
  const rawWidth = ((e - s) / 60000) * pxPerMinute;

  // gridWidthPx 안 넘겨주면, 최소한 0부터만 보이게 처리
  const maxW = Number.isFinite(gridWidthPx) ? gridWidthPx : Infinity;

  const visLeft = Math.max(0, rawLeft);
  const visRight = Math.min(maxW, rawLeft + rawWidth);
  const visWidth = Math.max(0, visRight - visLeft);

  return { left: visLeft, width: Math.max(10, visWidth) };
};
