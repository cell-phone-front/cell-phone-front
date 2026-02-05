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

  // 메인
  main: [{ name: "대시보드", url: "/dashboard", icon: LayoutDashboard }],

  // 스케줄
  schedule: [{ name: "내 근무", url: "/work", icon: CalendarDays }],

  // 테이블
  tables: [
    { title: "생산대상", url: "/product", icon: Boxes },
    { title: "공정단계", url: "/operation", icon: Factory },
    { title: "매칭작업", url: "/tasks", icon: ListChecks },
    { title: "기계", url: "/machine", icon: Cpu },
  ],

  // 결과분석
  navMain: [
    {
      title: "결과분석",
      icon: ChartColumnStacked,
      items: [
        { title: "시뮬레이션", url: "/simulation", icon: GanttChartSquare },
        { title: "간트", url: "/gantt", icon: GanttChartSquare },
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
        {/* 메인 */}
        <NavProjects
          label="메인"
          projects={data.main}
          onNavigate={onNavigate}
        />

        {/* 스케줄 */}
        <NavProjects
          label="스케줄"
          projects={data.schedule}
          onNavigate={onNavigate}
        />

        {/* 테이블 */}
        <NavLinks label="테이블" items={data.tables} />

        {/* 결과분석 */}
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
