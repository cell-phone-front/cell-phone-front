import DashboardShell from "@/components/dashboard-shell";
import { DashboardCalendar } from "@/components/dashboard/calendar";
import DashboardProducts from "@/components/dashboard/products";
import DashboardNotice from "@/components/dashboard/notice";

export default function Page() {
  return (
    <DashboardShell crumbTop="스케줄" crumbCurrent="대시보드">
      <div className="h-full min-h-0 flex flex-col gap-4 p-4">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-white aspect-video rounded-xl overflow-hidden min-h-0">
            <DashboardCalendar />
          </div>

          <div className="bg-white aspect-video rounded-xl">
            <DashboardProducts />
          </div>
          <div className="bg-amber-200 aspect-video rounded-xl overflow-hidden min-h-0">
            <DashboardNotice />
          </div>

          <div className="bg-gray-200 flex-1 rounded-xl min-h-0" />
        </div>
      </div>
    </DashboardShell>
  );
}
