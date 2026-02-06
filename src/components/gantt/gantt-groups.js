// src/components/gantt-test/gantt-groups.js

export function buildGroupsByProductOperation(scheduleList = []) {
  const prodMap = new Map();

  function splitProducts(v) {
    const s = String(v || "").trim();
    if (!s) return ["NO_PRODUCT"];

    // "iPhone, Galaxy" / "iPhone | Galaxy" / "iPhone / Galaxy" 방어
    const parts = s
      .split(/[,|/]/g)
      .map((x) => x.trim())
      .filter(Boolean);

    return parts.length ? parts : ["NO_PRODUCT"];
  }

  for (const s of scheduleList || []) {
    const productNames = splitProducts(s.productName);

    const operationId = String(s.operationId ?? "NO_OPERATION");
    const operationName = String(s.operationName || "");

    const taskId = String(s.taskId ?? "TASK");
    const taskName = String(s.taskName || "");

    const plannerName = s.plannerName || s.planner || s.planerName || "";
    const workerName = s.workerName || s.worker || "";

    const startAt = s.startAt;
    const endAt = s.endAt;

    // ✅ 시간 없으면 스킵 (렌더/범위 계산 깨짐 방지)
    if (!startAt || !endAt) continue;

    // ✅ product가 여러 개면 각각에 동일 task를 넣음 (합쳐지는 현상 방지)
    for (const productName of productNames) {
      if (!prodMap.has(productName)) prodMap.set(productName, new Map());
      const opMap = prodMap.get(productName);

      // ✅ op.id는 반드시 product 포함해서 유니크하게
      const opKey = `${productName}__${operationId}`;

      if (!opMap.has(opKey)) {
        opMap.set(opKey, {
          id: opKey,
          operationId,
          operationName,
          plannerName: plannerName || "",
          tasks: [],
        });
      }

      const opNode = opMap.get(opKey);

      if (!opNode.plannerName && plannerName) opNode.plannerName = plannerName;
      if (!opNode.operationName && operationName)
        opNode.operationName = operationName;

      // ✅ task id도 유니크하게
      const taskKey = `${opKey}__${taskId}__${startAt}__${endAt}`;

      opNode.tasks.push({
        id: taskKey,
        taskId,
        taskName,
        workerName,
        startAt,
        endAt,
        raw: s,
      });
    }
  }

  // ✅ groups: [{ id: productName, title: productName, operations: [...] }]
  const groups = Array.from(prodMap.entries()).map(([productName, opMap]) => {
    const operations = Array.from(opMap.values()).map((op) => {
      op.tasks.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
      return op;
    });

    // operation 정렬(원하면 operationName 기준으로 바꿔도 됨)
    operations.sort((a, b) =>
      String(a.operationId).localeCompare(String(b.operationId)),
    );

    return {
      id: productName,
      title: productName,
      operations,
    };
  });

  // product 정렬
  groups.sort((a, b) => String(a.title).localeCompare(String(b.title)));

  return groups;
}
