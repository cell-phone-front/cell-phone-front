"use client";

import * as React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Boxes,
  Factory,
  ListChecks,
  Cpu,
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
import { NavTables } from "@/components/nav-tables";

import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { useAccount } from "@/stores/account-store";

const data = {
  teams: [{ name: "PhoneFlow", logo: SquareTerminal, plan: "Enterprise" }],

  main: [{ name: "대시보드", url: "/dashboard", icon: LayoutDashboard }],
  schedule: [{ name: "내 근무", url: "/work", icon: CalendarDays }],

  // ✅ 테이블: 생산대상만 2단 펼침
  tables: [
    {
      title: "생산",
      icon: Boxes,
      items: [
        { title: "생산 대상", url: "/product", icon: Boxes },
        { title: "공정 순서 관리", url: "/product-routing" },
      ],
    },
    { title: "공정 단계", url: "/operation", icon: Factory },
    { title: "매칭 작업", url: "/tasks", icon: ListChecks },
    { title: "기계", url: "/machine", icon: Cpu },
  ],

  // ✅ 결과분석: 펼침 없이 단일(계정관리처럼)
  analysis: [
    { title: "시뮬레이션", url: "/simulation", icon: ChartColumnStacked },
  ],

  community: [
    { title: "공지사항", url: "/notice", icon: Pin },
    { title: "자유게시판", url: "/board", icon: MessageSquareText },
  ],

  admin: [{ title: "계정관리", url: "/accounts", icon: Users }],
};

function toRoleLower(role) {
  return String(role || "").toLowerCase();
}

export function AppSidebar({ onNavigate, ...props }) {
  const { account } = useAccount();
  const role = toRoleLower(account?.role);

  const canSeeAll = role === "admin" || role === "planner";

  return (
    <Sidebar className="w-64" {...props}>
      <SidebarContent>
        <NavProjects
          label="메인"
          projects={data.main}
          onNavigate={onNavigate}
        />
        <NavProjects
          label="스케줄"
          projects={data.schedule}
          onNavigate={onNavigate}
        />

        {canSeeAll && (
          <>
            <NavTables label="테이블" items={data.tables} />

            {/* ✅ 결과분석(단일) */}
            <NavLinks label="결과분석" items={data.analysis} />
          </>
        )}

        <NavCommunity label="게시판" items={data.community} />

        {canSeeAll && <NavLinks label="계정관리" items={data.admin} />}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
