// src/components/gantt-test/gantt-groups-machine.js

export function buildGroupsByMachine(scheduleList = []) {
  const map = new Map();

  for (const s of scheduleList || []) {
    const startAt = s.startAt;
    const endAt = s.endAt;
    if (!startAt || !endAt) continue;

    const machineId = String(s.machineId ?? "NO_MACHINE");
    const machineName = String(s.machineName || "");
    const title = machineName ? `${machineId} · ${machineName}` : machineId;

    if (!map.has(machineId)) {
      map.set(machineId, {
        id: machineId,
        title,
        machineId,
        machineName,
        tasks: [],
      });
    }

    const g = map.get(machineId);

    const taskId = String(s.taskId ?? "TASK");
    const taskName = String(s.taskName || "");
    const workerName = s.workerName || s.worker || "";
    const plannerName = s.plannerName || s.planner || "";

    const taskKey = `${machineId}__${taskId}__${startAt}__${endAt}`;

    g.tasks.push({
      id: taskKey,
      taskId,
      taskName,
      workerName,
      plannerName,
      startAt,
      endAt,
      raw: s,
    });
  }

  const groups = Array.from(map.values());

  // 머신 정렬
  groups.sort((a, b) => String(a.title).localeCompare(String(b.title)));

  // 각 머신 내부 task는 시간순 정렬
  for (const g of groups) {
    g.tasks.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }

  // 빈 머신 제거
  return groups.filter((g) => (g.tasks || []).length > 0);
}
