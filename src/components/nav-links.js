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

export function NavLinks({ label, items = [] }) {
  const router = useRouter();
  const currentPath = (router.asPath || "").split("?")[0];

  if (!items.length) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const active = item.url && currentPath.startsWith(item.url);
          const Icon = item.icon;

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                <Link href={item.url}>
                  {Icon ? <Icon /> : null}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
