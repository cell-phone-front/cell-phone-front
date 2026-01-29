"use client";

import * as React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Boxes,
  Factory,
  ListChecks,
  Cpu,
  FlaskConical,
  GanttChartSquare,
  BarChart3,
  Pin,
  MessageSquareText,
  Users,
  SquareTerminal,
  ChartColumnStacked,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavLinks } from "@/components/nav-links";
import { NavCommunity } from "@/components/nav-community";

import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";

const data = {
  teams: [{ name: "PhoneFlow", logo: SquareTerminal, plan: "Enterprise" }],

  // 스케줄(상단)
  projects: [
    { name: "대시보드", url: "/dashboard", icon: LayoutDashboard },
    { name: "내 근무", url: "/work", icon: CalendarDays },
  ],

  // 테이블(단일 링크들)
  tables: [
    { title: "생산단계", url: "/product", icon: Boxes },
    { title: "공정단계", url: "/operation", icon: Factory },
    { title: "매칭작업", url: "/tasks", icon: ListChecks }, // 너 폴더가 tasks라 /tasks
    { title: "기계", url: "/machine", icon: Cpu }, // 너 폴더가 tools라 /tools (기계로 쓸거면 나중에 /machine로 바꿔도 됨)
  ],

  // 결과분석(접힘/펼침)
  navMain: [
    {
      title: "시뮬레이션",
      icon: ChartColumnStacked,
      items: [
        { title: "간트", url: "/gantt", icon: GanttChartSquare },
        { title: "차트", url: "/scenarios", icon: BarChart3 }, // 너 폴더가 scenarios라 /scenarios
      ],
    },
  ],

  // 게시판
  community: [
    { title: "공지사항", url: "/notice", icon: Pin },
    { title: "자유게시판", url: "/board", icon: MessageSquareText },
  ],

  // 계정관리
  admin: [{ title: "계정관리", url: "/accounts", icon: Users }],
};

export function AppSidebar({ onNavigate, ...props }) {
  return (
    <Sidebar className="w-64" {...props}>
      <SidebarContent>
        {/* 스케줄 */}
        <NavProjects projects={data.projects} onNavigate={onNavigate} />

        {/* 테이블 */}
        <NavLinks label="테이블" items={data.tables} />

        {/* 결과분석 (Collapsible) */}
        <NavMain label="결과분석" items={data.navMain} />

        {/* 게시판 */}
        <NavCommunity label="게시판" items={data.community} />

        {/* 계정관리 */}
        <NavLinks label="계정관리" items={data.admin} />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
