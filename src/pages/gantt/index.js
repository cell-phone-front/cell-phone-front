import DashboardShell from "@/components/dashboard-shell";
import WorkGantt from "@/components/gantt/gantt";

export default function Gantt() {
  return (
    <DashboardShell crumbTop="결과분석" crumbCurrent="시뮬레이션">
      <WorkGantt />
    </DashboardShell>
  );
}
