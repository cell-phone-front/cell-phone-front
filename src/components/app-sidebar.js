"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Frame,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  teams: [{ name: "Acme Inc", logo: SquareTerminal, plan: "Enterprise" }],
  projects: [
    { name: "대시보드", url: "/", icon: Map },
    { name: "내 근무", url: "/work", icon: Frame },
    { name: "라인 일정", url: "/line", icon: PieChart },
  ],

  navMain: [
    { title: "시뮬레이션", url: "/", icon: SquareTerminal },
    { title: "간트", url: "/gantt", icon: Bot },
    { title: "Documentation", url: "#", icon: BookOpen },
    { title: "Settings", url: "#", icon: Settings2 },
  ],
};

export function AppSidebar({ onNavigate, ...props }) {
  return (
    <Sidebar className="w-64" {...props}>
      <SidebarContent>
        <NavProjects projects={data.projects} onNavigate={onNavigate} />
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
