import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";
import { getSimulationSchedule } from "@/api/simulation-api";

import GanttBoard from "@/components/gantt/gantt-board";

export default function SimulationGanttPage() {
  const router = useRouter();
  const token = useToken((s) => s.token);
  const { simulationId } = router.query;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token || !simulationId) return;

    setLoading(true);
    setErr("");

    (async () => {
      try {
        const json = await getSimulationSchedule(simulationId, token);

        /**
         * ⬇️ 백엔드에서 내려주는 구조 예시 (가정)
         * {
         *   scheduleList: [
         *     {
         *       taskId,
         *       taskName,
         *       machineName,
         *       startTime,
         *       endTime
         *     }
         *   ]
         * }
         */

        const list = json?.scheduleList || json?.items || [];

        console.log("RAW LIST:", list);
        console.log("GROUPS:", groups);
        // 👉 GanttBoard용 row로 변환
        const ganttRows = list.map((r) => ({
          id: r.taskId,
          label: r.taskName,
          machine: r.machineName,
          start: r.startTime,
          end: r.endTime,
        }));

        setRows(ganttRows);
      } catch (e) {
        setErr(e.message || "간트 데이터 조회 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, simulationId]);

  return (
    <DashboardShell crumbTop="시뮬레이션" crumbCurrent="Gantt">
      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">시뮬레이션 간트</div>
            <div className="text-sm text-gray-500 font-mono">
              simulationId: {simulationId}
            </div>
          </div>

          <button
            className="h-9 px-4 rounded-md border text-sm"
            onClick={() => router.push("/simulation")}
          >
            목록으로
          </button>
        </div>

        {err && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="border rounded-lg bg-white p-6 text-gray-500">
            간트 로딩중...
          </div>
        ) : (
          <div className="border rounded-lg bg-white">
            <GanttBoard rows={rows} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
