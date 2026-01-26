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
  crumbTop = "스케쥴",
  crumbCurrent = "",
  children,
}) {
  return (
    <SidebarProvider className="h-screen pt-14">
      <AppSidebar />
      {/* // 영역 안나가게 큰틀 */}
      <SidebarInset className="h-full min-w-0 flex flex-col bg-muted/50">
        <header className="h-16 shrink-0 flex items-center gap-2 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">{crumbTop}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{crumbCurrent}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* 컨텐츠 영역(공통 카드) */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0">
          <div className="h-full w-full rounded-xl overflow-hidden min-h-0">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
