"use client";

import Link from "next/link";
import { useRouter } from "next/router";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavProjects({ projects = [], label = "스케줄" }) {
  const router = useRouter();
  const currentPath = (router.asPath || "").split("?")[0];

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const active = item.url && currentPath.startsWith(item.url);
          const Icon = item.icon;

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={active} tooltip={item.name}>
                <Link href={item.url}>
                  {Icon ? <Icon /> : null}
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
