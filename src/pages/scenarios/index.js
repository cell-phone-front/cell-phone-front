import DashboardShell from "@/components/dashboard-shell";
import { ScenarioDialog } from "@/components/scenario-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToken } from "@/stores/account-store";

import { getScenarios, simulateScenario } from "@/api/scenario-api";

export default function ScenarioPage() {
  const token = useToken((s) => s.token);

  const [scenarios, setScenarios] = useState(null);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const list = await getScenarios(token);
      setScenarios(list || []);
    } catch (e) {
      console.error(e);
      setLoadError(e?.message || "시나리오 조회 실패");
      setScenarios([]);
    }
  }, [token]);

  useEffect(() => {
    // 토큰 없으면 일단 빈 화면 대신 "없음" 처리
    // (너가 토큰 필수로 만들고 싶으면 여기서 return 하면 됨)
    reload();
  }, [reload]);

  const updateScenarioStatus = (scenarioId, status) => {
    setScenarios((prev) =>
      (prev || []).map((one) =>
        one.id === scenarioId ? { ...one, status } : one,
      ),
    );
  };

  const runBtHandle = async (scenarioId) => {
    updateScenarioStatus(scenarioId, "PENDING");

    try {
      const json = await simulateScenario(scenarioId, token);
      updateScenarioStatus(scenarioId, json?.status || "READY");
    } catch (e) {
      console.error(e);
      alert(e?.message || "시뮬레이션 실행 실패");
      updateScenarioStatus(scenarioId, "READY");
    }
  };

  return (
    <DashboardShell crumbTop="시뮬레이션" crumbCurrent="scenario">
      <ScenarioDialog onCreated={reload} />

      {loadError && (
        <div className="px-6 pb-4 text-sm text-red-500">{loadError}</div>
      )}

      {!scenarios ? (
        <div className="p-6">로딩중</div>
      ) : scenarios.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">시나리오가 없습니다.</div>
      ) : (
        <Table className="select-none">
          <TableCaption>시나리오 목록</TableCaption>

          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Scenario Id</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Job Count</TableHead>
              <TableHead className="w-60">Status</TableHead>
              <TableHead className="w-[120px] text-right"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {scenarios.map((one) => (
              <TableRow key={one.id} className="h-[56px]">
                <TableCell className="font-medium">{one.id}</TableCell>
                <TableCell className="truncate max-w-[520px]">
                  {one.description}
                </TableCell>
                <TableCell>{one.jobCount}</TableCell>
                <TableCell>{one.status}</TableCell>

                <TableCell className="text-right">
                  {one.status === "READY" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runBtHandle(one.id)}
                      className="gap-1"
                    >
                      Run
                      <Check className="h-4 w-4" />
                    </Button>
                  )}

                  {one.status === "PENDING" && (
                    <Button
                      variant="ghost"
                      disabled
                      size="sm"
                      className="gap-2"
                    >
                      Pending
                      <Spinner />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardShell>
  );
}
