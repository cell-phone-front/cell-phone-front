// src/components/dashboard-gantt/util.js
import { toMs } from "@/components/gantt/gantt-utils";

export function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

export function safeText(v) {
  return String(v ?? "").trim();
}

export function fmtYMD(v) {
  const s = safeText(v);
  if (!s) return "-";
  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];
  return s.slice(0, 10);
}

export function barOk(startAt, endAt) {
  const s = toMs(startAt);
  const e = toMs(endAt);
  return Number.isFinite(s) && Number.isFinite(e) && e - s >= 60 * 1000;
}
