// src/components/gantt-test/gantt-utils.js

export const pad2 = (n) => String(n).padStart(2, "0");

export const toDate = (d) => (d instanceof Date ? d : new Date(d));

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

export const calcBar = ({ task, rangeStart, stepMinutes, colWidth }) => {
  const s = toMs(task.startAt);
  const e = toMs(task.endAt);

  const startMin = (s - rangeStart.getTime()) / 60000;
  const endMin = (e - rangeStart.getTime()) / 60000;

  const left = (startMin / stepMinutes) * colWidth;
  const width = Math.max(10, ((endMin - startMin) / stepMinutes) * colWidth);

  return { left, width };
};
