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

export default function DashboardShell({
  crumbTop = "스케줄",
  crumbCurrent = "",
  children,
}) {
  return (
    <SidebarProvider className="h-screen pt-14">
      <AppSidebar />

      {/* 전체 배경 + 공통 여백/폭 */}
      <SidebarInset className="h-full min-w-0 flex flex-col bg-gray-100">
        {/* 상단 breadcrumb */}
        <header className="shrink-0 px-6 pt-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-2">
              {/* 트리거: 작게 + 호버 제거 */}
              <SidebarTrigger className="h-6 w-6 hover:bg-transparent active:bg-transparent" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4"
              />

              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#" className="text-slate-600 text-xs">
                      {crumbTop}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-slate-900 font-medium text-xs">
                      {crumbCurrent}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
        </header>

        {/* 컨텐츠 공통 영역(대시보드와 동일 여백/폭) */}
        <main className="flex-1 min-h-0 px-6 pb-6 pt-4">
          <div className="mx-auto max-w-7xl w-full h-full min-h-0">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
