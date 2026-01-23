import DashboardShell from "@/components/dashboard-shell";
import { CalendarCustomDays } from "@/components/work-calendar";

export default function Work() {
  return (
    <DashboardShell crumbTop="스케쥴" crumbCurrent="내 근무">
      <CalendarCustomDays />
    </DashboardShell>
  );
}
