// src/components/gantt/gantt-groups.js

export function buildGroupsByProductOperation(scheduleList = []) {
  const prodMap = new Map();

  for (const s of scheduleList || []) {
    const productName = s.productName || "NO_PRODUCT";
    const operationId = String(s.operationId ?? "NO_OPERATION");

    const taskId = String(s.taskId ?? s.taskName ?? "TASK");
    const plannerName = s.plannerName || s.planner || s.planerName || ""; // 혹시 키 다를 때 대비
    const workerName = s.workerName || s.worker || s.machineName || "";

    if (!prodMap.has(productName)) prodMap.set(productName, new Map());
    const opMap = prodMap.get(productName);

    if (!opMap.has(operationId)) {
      opMap.set(operationId, {
        id: `${productName}__${operationId}`,
        operationId,
        plannerName: plannerName || "",
        tasks: [],
      });
    }

    const opNode = opMap.get(operationId);

    // operation에 plannerName이 비어있고 이번에 들어온 값이 있으면 채움
    if (!opNode.plannerName && plannerName) opNode.plannerName = plannerName;

    opNode.tasks.push({
      id:
        s.id ||
        `${productName}__${operationId}__${taskId}__${s.startAt}__${s.endAt}`,
      taskId,
      workerName,
      startAt: s.startAt,
      endAt: s.endAt,
      raw: s,
    });
  }

  const groups = Array.from(prodMap.entries()).map(([productName, opMap]) => {
    const operations = Array.from(opMap.values()).map((op) => {
      op.tasks.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
      return op;
    });

    // operation 정렬(원하시면 startAt 기준으로도 가능)
    operations.sort((a, b) =>
      String(a.operationId).localeCompare(String(b.operationId)),
    );

    return {
      id: productName,
      title: productName,
      operations,
    };
  });

  return groups;
}
