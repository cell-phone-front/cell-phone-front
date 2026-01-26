import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Eye,
  Clock,
  Pin,
} from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";

const MOCK = [
  {
    id: 101,
    pinned: true,
    title: "📌 공지: 자유게시판 이용 규칙",
    author: "관리자",
    createdAt: "2026-01-26 09:00",
    views: 1280,
    comments: 12,
  },
  {
    id: 100,
    pinned: false,
    title: "라인 점검 일정 공유합니다",
    author: "totoro",
    createdAt: "2026-01-26 08:10",
    views: 83,
    comments: 4,
  },
  {
    id: 99,
    pinned: false,
    title: "오늘 야간 근무 교대 가능하신 분?",
    author: "김철수",
    createdAt: "2026-01-25 20:44",
    views: 221,
    comments: 18,
  },
  { 
    id: 98,
    pinned: false,
    title: "CNC 공정 세팅 팁 공유",
    author: "박영희",
    createdAt: "2026-01-25 13:02",
    views: 145,
    comments: 2,
  },
  {
    id: 97,
    pinned: false,
    title: "불량 원인 체크리스트 같이 정리해요",
    author: "planner01",
    createdAt: "2026-01-24 17:33",
    views: 402,
    comments: 29,
  },
];

function fmtRoleBadge(role) {
  if (role === "사장") return "bg-red-50 text-red-600 border-red-200";
  if (role === "팀장") return "bg-blue-50 text-blue-600 border-blue-200";
  return "bg-neutral-50 text-neutral-600 border-neutral-200";
}

export default function Board() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("latest"); // latest | views | comments
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const rows = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    let filtered = MOCK.filter((r) => {
      if (!keyword) return true;
      return (
        r.title.toLowerCase().includes(keyword) ||
        r.author.toLowerCase().includes(keyword)
      );
    });

    // 핀 먼저
    const pinned = filtered.filter((r) => r.pinned);
    const normal = filtered.filter((r) => !r.pinned);

    // 정렬
    const sorter = (a, b) => {
      if (sort === "views") return (b.views || 0) - (a.views || 0);
      if (sort === "comments") return (b.comments || 0) - (a.comments || 0);
      // latest: id 큰 게 최신이라는 가정(임시)
      return (b.id || 0) - (a.id || 0);
    };

    pinned.sort(sorter);
    normal.sort(sorter);

    return [...pinned, ...normal];
  }, [q, sort]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  function goWrite() {
    // 글쓰기 페이지를 만들면 연결
    router.push("/board/write");
  }

  function openPost(id) {
    // 상세 페이지 만들면 연결
    router.push(`/board/${id}`);
  }

  return (
    <DashboardShell>
      <div className="h-full w-full bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 border-neutral-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-neutral-600" />
              <h1 className="text-base font-semibold text-neutral-900">
                자유게시판
              </h1>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              업무 공유 / 질문 / 팁 까지 편하게 올려주세요.
            </p>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-neutral-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* 검색 */}
          <button
            type="button"
            onClick={goWrite}
            className="shrink-0 h-7 px-3 rounded-md bg-slate-900 text-white text-sm font-medium
                     hover:bg-slate-800 active:scale-[0.99] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            글쓰기
          </button>
          {/* <div className="w-full md:max-w-md">
            <div className="h-9 px-3 border border-neutral-200 rounded-md flex items-center gap-2 bg-white">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="제목 또는 작성자 검색"
                className="w-full text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
          </div> */}

          {/* 정렬 + 카운트 */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="text-xs text-neutral-500">
              총 <span className="font-semibold text-neutral-700">{total}</span>
              건
            </div>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-7 px-3 rounded-md border border-neutral-200 bg-white text-sm outline-none"
            >
              <option value="latest">최신순</option>
              <option value="views">조회순</option>
              <option value="comments">댓글순</option>
            </select>
          </div>
        </div>

        {/* 리스트 */}
        <div className="min-h-0">
          {/* 데스크탑 테이블 */}
          <div className="hidden md:block">
            <div className="grid grid-cols-12 px-5 py-2 text-[11px] text-neutral-500 bg-neutral-50 border-b border-neutral-200">
              <div className="col-span-6">제목</div>
              <div className="col-span-2">작성자</div>
              <div className="col-span-2">작성일</div>
              <div className="col-span-1 text-right">조회</div>
              <div className="col-span-1 text-right">댓글</div>
            </div>

            {pageRows.length === 0 ? (
              <div className="px-5 py-16 text-center text-sm text-neutral-500">
                검색 결과가 없어요.
              </div>
            ) : (
              pageRows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openPost(r.id)}
                  className="w-full text-left grid grid-cols-12 px-5 py-3 border-b border-neutral-100
                           hover:bg-neutral-50 transition"
                >
                  <div className="col-span-6 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.pinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-[2px] rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                          <Pin className="w-3 h-3" />
                          고정
                        </span>
                      )}
                      <span className="truncate text-sm text-neutral-900 font-medium">
                        {r.title}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2 text-sm text-neutral-700 truncate">
                    {r.author}
                  </div>

                  <div className="col-span-2 text-sm text-neutral-500 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-300" />
                    <span className="truncate">{r.createdAt}</span>
                  </div>

                  <div className="col-span-1 text-sm text-neutral-600 text-right flex items-center justify-end gap-1">
                    <Eye className="w-4 h-4 text-neutral-300" />
                    {r.views}
                  </div>

                  <div className="col-span-1 text-sm text-neutral-600 text-right">
                    {r.comments}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden">
            {pageRows.length === 0 ? (
              <div className="px-5 py-16 text-center text-sm text-neutral-500">
                검색 결과가 없어요.
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {pageRows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openPost(r.id)}
                    className="w-full text-left rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {r.pinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-[2px] rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                              <Pin className="w-3 h-3" />
                              고정
                            </span>
                          )}
                          <div className="text-sm font-semibold text-neutral-900 truncate">
                            {r.title}
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-neutral-500 flex items-center gap-2">
                          <span className="text-neutral-700">{r.author}</span>
                          <span>•</span>
                          <span>{r.createdAt}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs text-neutral-500 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="w-4 h-4 text-neutral-300" />
                          {r.views}
                        </div>
                        <div className="mt-1">댓글 {r.comments}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 하단 페이지네이션 */}
        <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {safePage} / {pageCount} 페이지
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-9 px-3 rounded-md border border-neutral-200 bg-white text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
              className="h-9 px-3 rounded-md border border-neutral-200 bg-white text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
