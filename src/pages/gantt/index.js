import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import WorkGantt from "@/components/gantt/gantt";

export default function Gantt() {
  return (
    <SidebarProvider className="h-screen pt-16">
      <AppSidebar />

      {/* min-w-0 중요 (flex에서 오른쪽이 튀어나가는거 방지) */}
      <SidebarInset className="h-full min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center gap-2 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">결과분석</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>간트</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* ✅ 캘린더처럼 “박스 안”에 꽉 차게 */}
        <div className="flex-1 min-h-0 min-w-0 p-4 pt-0">
          <div className="h-full w-full rounded-xl border bg-background overflow-hidden min-w-0">
            <WorkGantt />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
