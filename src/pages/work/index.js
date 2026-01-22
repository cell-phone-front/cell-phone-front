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
import { CalendarCustomDays } from "@/components/work-calendar";

export default function Work() {
  return (
    <SidebarProvider className="h-screen pt-16">
      <AppSidebar />
      <SidebarInset className="h-full flex flex-col">
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
                  <BreadcrumbLink href="#">스케쥴</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>내 근무</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        {/* 달력 */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="h-full w-full rounded-xl border bg-background overflow-hidden">
            <CalendarCustomDays />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
