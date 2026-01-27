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
  LayoutDashboard,
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
import { NavCommunity } from "./nav-community";

const data = {
  teams: [{ name: "Acme Inc", logo: SquareTerminal, plan: "Enterprise" }],
  projects: [
    { name: "대시보드", url: "/dashboard", icon: LayoutDashboard },
    { name: "내 근무", url: "/work", icon: PieChart },
  ],

  navMain: [
    {
      title: "시뮬레이션",
      url: "/",
      icon: SquareTerminal,
      items: [
        { title: "member", url: "/member" },
        { title: "product", url: "/product" },
        { title: "jobs", url: "/jobs" },
        { title: "tasks", url: "/tasks" },
        { title: "tools", url: "/tools" },
      ],
    },
    {
      title: "간트",
      url: "", // 상위 클릭 시 이동(원하면 #로 바꿔도 됨)
      icon: Bot,
      // isActive: true, // 기본으로 펼치고 싶으면 true
      items: [
        { title: "전체보기", url: "/gantt/member" },
        { title: "멤버별", url: "/gantt" },
      ],
    },
  ],
  community: [
    { name: "공지사항", url: "/notice", icon: Map },
    { name: "자유게시판", url: "/board", icon: Frame },
  ],
  member: [{ name: "관리", url: "/notice", icon: Map }],
};

export function AppSidebar({ onNavigate, ...props }) {
  return (
    <Sidebar className="w-64" {...props}>
      <SidebarContent>
        <NavProjects projects={data.projects} onNavigate={onNavigate} />
        <NavMain items={data.navMain} />
        <NavCommunity projects={data.community} onNavigate={onNavigate} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
