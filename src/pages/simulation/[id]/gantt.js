// pages/gantt/index.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";
import { getSimulationSchedule } from "@/api/simulation-api";

function toMs(v) {
  if (!v) return NaN;
  // "2026-02-04T12:00:00" 형태면 Date가 바로 파싱됨
  const t = new Date(v).getTime();
  return t;
}

function fmtHM(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function safeStr(v) {
  return v == null ? "" : String(v);
}

/**
 * scheduleList를 머신/프로덕트 트리용으로 변환
 */
function buildMachineTree(scheduleList) {
  // machineId -> tasks(taskId[])
  const map = new Map();
  for (const s of scheduleList) {
    const machineId = safeStr(
      s.machineId || s.machineName || "UNKNOWN_MACHINE",
    );
    const taskId = safeStr(s.taskId || s.taskName || "UNKNOWN_TASK");
    if (!map.has(machineId)) map.set(machineId, []);
    map.get(machineId).push(taskId);
  }

  const nodes = Array.from(map.entries()).map(([machineId, taskIds]) => ({
    key: machineId,
    label: machineId,
    children: uniq(taskIds).map((tid) => ({
      key: `${machineId}__${tid}`,
      label: tid,
      value: { machineId, taskId: tid },
    })),
  }));

  nodes.sort((a, b) => a.label.localeCompare(b.label));
  return nodes;
}

function buildProductTree(scheduleList) {
  // productName -> operationName -> taskName[]
  const map = new Map();
  for (const s of scheduleList) {
    const productName = safeStr(s.productName || "UNKNOWN_PRODUCT");
    const opName = safeStr(
      s.operationName || s.operationId || "UNKNOWN_OPERATION",
    );
    const taskName = safeStr(s.taskName || s.taskId || "UNKNOWN_TASK");

    if (!map.has(productName)) map.set(productName, new Map());
    const opMap = map.get(productName);
    if (!opMap.has(opName)) opMap.set(opName, []);
    opMap.get(opName).push(taskName);
  }

  const nodes = Array.from(map.entries()).map(([productName, opMap]) => ({
    key: productName,
    label: productName,
    children: Array.from(opMap.entries())
      .map(([opName, taskNames]) => ({
        key: `${productName}__${opName}`,
        label: opName,
        children: uniq(taskNames).map((tn) => ({
          key: `${productName}__${opName}__${tn}`,
          label: tn,
          value: { productName, operationName: opName, taskName: tn },
        })),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));

  nodes.sort((a, b) => a.label.localeCompare(b.label));
  return nodes;
}

/**
 * 아주 단순한 간트 렌더러 (GanttBoard 없어도 일단 “찍히게”)
 * - 시간축은 scheduleList의 min~max 를 기준으로 비율로 그림
 */
function SimpleGantt({ items }) {
  const times = useMemo(() => {
    const starts = items
      .map((x) => toMs(x.startAt))
      .filter((t) => !Number.isNaN(t));
    const ends = items
      .map((x) => toMs(x.endAt))
      .filter((t) => !Number.isNaN(t));
    const minT = Math.min(...starts);
    const maxT = Math.max(...ends);
    return { minT, maxT, span: Math.max(1, maxT - minT) };
  }, [items]);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <div>{items.length}건</div>
        <div>
          {Number.isFinite(times.minT) ? fmtHM(times.minT) : "-"} ~{" "}
          {Number.isFinite(times.maxT) ? fmtHM(times.maxT) : "-"}
        </div>
      </div>

      <div className="space-y-2">
        {items.map((s) => {
          const st = toMs(s.startAt);
          const en = toMs(s.endAt);

          const left = Number.isNaN(st)
            ? 0
            : ((st - times.minT) / times.span) * 100;
          const width =
            Number.isNaN(st) || Number.isNaN(en)
              ? 8
              : Math.max(2, ((en - st) / times.span) * 100);

          const labelLeft = `${safeStr(s.taskId || s.taskName)}`;
          const labelRight = `${fmtHM(s.startAt)} ~ ${fmtHM(s.endAt)}`;

          return (
            <div
              key={`${s.id}-${labelLeft}`}
              className="rounded-lg border bg-white p-2"
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <div className="font-medium text-slate-800">
                  {labelLeft}
                  <span className="ml-2 text-slate-400">
                    {safeStr(s.machineId)} / {safeStr(s.productName)}
                  </span>
                </div>
                <div className="text-slate-600">{labelRight}</div>
              </div>

              <div className="relative h-7 w-full rounded bg-slate-100">
                <div
                  className="absolute top-0 h-7 rounded bg-sky-300"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${labelLeft} (${labelRight})`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 트리 UI (간단 버전)
 */
function TreeMenu({ nodes, onPick, pickedKey }) {
  return (
    <div className="space-y-2">
      {nodes.map((n) => (
        <div key={n.key} className="rounded-lg border bg-white">
          <div className="px-3 py-2 text-sm font-semibold text-slate-800">
            {n.label}
          </div>

          <div className="border-t">
            {n.children?.map((c) => (
              <button
                key={c.key}
                onClick={() => onPick(c)}
                className={[
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                  "hover:bg-slate-50",
                  pickedKey === c.key ? "bg-slate-100 font-semibold" : "",
                ].join(" ")}
              >
                <span className="text-slate-800">{c.label}</span>
                <span className="text-xs text-slate-400">▶</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GanttPage() {
  const router = useRouter();
  const token = useToken((s) => s.token);

  // URL에서 어떤 id를 쓸지 유연하게 처리
  // 예: /gantt?id=8cde4b 또는 /gantt?simulationId=8cde4b
  const scheduleId =
    router.query.id || router.query.simulationId || router.query.scheduleId;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [raw, setRaw] = useState([]);

  const [tab, setTab] = useState("MACHINE"); // MACHINE | PRODUCT

  // 선택 상태
  const [pickedKey, setPickedKey] = useState("");
  const [picked, setPicked] = useState(null); // {machineId, taskId} or {productName, operationName, taskName}

  useEffect(() => {
    if (!token || !scheduleId) return;

    setLoading(true);
    setErr("");

    (async () => {
      try {
        const json = await getSimulationSchedule(scheduleId, token);

        const list = json?.scheduleList || json?.items || json?.data || [];
        // 혹시 startAt/endAt 이름이 다르면 여기서 normalize 가능
        setRaw(Array.isArray(list) ? list : []);
      } catch (e) {
        setErr(e?.message || "스케줄 조회 실패");
        setRaw([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, scheduleId]);

  const machineTree = useMemo(() => buildMachineTree(raw), [raw]);
  const productTree = useMemo(() => buildProductTree(raw), [raw]);

  const filtered = useMemo(() => {
    if (!picked) return raw;

    if (tab === "MACHINE") {
      const { machineId, taskId } = picked;
      return raw.filter((s) => {
        if (
          machineId &&
          safeStr(s.machineId || s.machineName) !== safeStr(machineId)
        )
          return false;
        if (taskId && safeStr(s.taskId || s.taskName) !== safeStr(taskId))
          return false;
        return true;
      });
    }

    // PRODUCT
    const { productName, operationName, taskName } = picked;
    return raw.filter((s) => {
      if (productName && safeStr(s.productName) !== safeStr(productName))
        return false;
      if (
        operationName &&
        safeStr(s.operationName || s.operationId) !== safeStr(operationName)
      )
        return false;
      if (taskName && safeStr(s.taskName || s.taskId) !== safeStr(taskName))
        return false;
      return true;
    });
  }, [raw, picked, tab]);

  const leftNodes = tab === "MACHINE" ? machineTree : productTree;

  const onPick = (node) => {
    setPickedKey(node.key);
    setPicked(node.value || null);
  };

  const clearPick = () => {
    setPickedKey("");
    setPicked(null);
  };

  return (
    <DashboardShell crumbTop="결과분석" crumbCurrent="간트">
      <div className="flex h-[calc(100vh-120px)] gap-3">
        {/* LEFT */}
        <div className="w-[340px] shrink-0 overflow-hidden rounded-xl border bg-slate-50">
          <div className="flex items-center gap-2 border-b bg-white p-2">
            <button
              className={[
                "rounded-lg px-3 py-2 text-sm",
                tab === "MACHINE" ? "bg-black text-white" : "bg-slate-100",
              ].join(" ")}
              onClick={() => {
                setTab("MACHINE");
                clearPick();
              }}
            >
              머신
            </button>
            <button
              className={[
                "rounded-lg px-3 py-2 text-sm",
                tab === "PRODUCT" ? "bg-black text-white" : "bg-slate-100",
              ].join(" ")}
              onClick={() => {
                setTab("PRODUCT");
                clearPick();
              }}
            >
              프로덕트
            </button>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {scheduleId ? `id=${scheduleId}` : "id 없음"}
              </span>
            </div>
          </div>

          <div className="h-full overflow-auto p-2">
            {loading ? (
              <div className="p-3 text-sm text-slate-500">불러오는 중…</div>
            ) : err ? (
              <div className="p-3 text-sm text-red-600">{err}</div>
            ) : leftNodes.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">데이터 없음</div>
            ) : (
              <TreeMenu
                nodes={leftNodes}
                onPick={onPick}
                pickedKey={pickedKey}
              />
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="min-w-0 flex-1 overflow-auto rounded-xl border bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              {tab === "MACHINE" ? "머신 기준 스케줄" : "프로덕트 기준 스케줄"}
              <span className="ml-2 text-xs font-normal text-slate-500">
                (왼쪽에서 선택하면 필터됨)
              </span>
            </div>

            <button
              onClick={clearPick}
              className="rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-100"
            >
              선택 해제
            </button>
          </div>

          {/* 여기서 너가 가진 GanttBoard로 바꾸고 싶으면
              filtered를 네 컴포넌트에 맞게 변환해서 넣으면 됨.
              일단은 “API가 찍히는지”부터 확인하려고 SimpleGantt로 보여줌 */}
          <SimpleGantt items={filtered} />
        </div>
      </div>
    </DashboardShell>
  );
}
