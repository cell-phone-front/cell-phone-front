// pages/board/index.js (자유게시판을 공지사항 틀로 변경한 버전)
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Pencil,
  Trash2,
} from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";
import { useAccount, useToken } from "@/stores/account-store";
import {
  getCommunities,
  getCommunityCommentCount,
  deleteCommunity,
} from "@/api/community-api";

function fmtDate(v) {
  if (!v) return "-";
  let d = String(v);
  if (d.includes("T")) d = d.split("T")[0];
  else if (d.includes(" ")) d = d.split(" ")[0];
  else d = d.slice(0, 10);
  const [y, m, day] = d.split("-");
  return `${y}.${Number(m)}.${Number(day)}`;
}

export default function Board() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const role = String(account?.role || "").toLowerCase();
  const canWriteCommunity = role === "planner" || role === "worker";

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // ✅ grid/row 스타일 상수 (중복 제거)
  const GRID = "grid grid-cols-[80px_1fr_100px_110px_40px_130px]";
  const ROW_BASE =
    "w-full text-left " +
    GRID +
    " px-6 h-12 items-center border-b border-neutral-100 hover:bg-neutral-100 transition cursor-pointer";

  // 글쓰기
  function goWrite() {
    router.push("/board-write");
  }

  function openPost(id) {
    if (id == null) return;
    router.push(`/board-view?id=${id}`);
  }

  // 서버 목록 + 댓글 수
  useEffect(() => {
    if (!token) return;

    let alive = true;
    setLoading(true);
    setLoadError("");

    (async () => {
      try {
        const json = await getCommunities(token);
        if (!alive) return;

        const list =
          json?.communities || json?.communityList || json?.items || json || [];
        const arr = Array.isArray(list) ? list : [];

        const ids = arr
          .map((r) => r.id ?? r.communityId ?? r.community_id)
          .filter((v) => v != null);

        const pairs = await Promise.all(
          ids.map(async (cid) => {
            try {
              const res = await getCommunityCommentCount(cid, token);
              const cnt =
                res?.count ??
                res?.commentCount ??
                res?.data ??
                (typeof res === "number" ? res : 0);
              return [String(cid), Number(cnt) || 0];
            } catch {
              return [String(cid), 0];
            }
          }),
        );

        const countMap = Object.fromEntries(pairs);

        const merged = arr.map((r) => {
          const cid = r.id ?? r.communityId ?? r.community_id;
          const serverCnt =
            r.comments ?? r.commentCount ?? r.comment_count ?? r.commentCnt;
          const apiCnt = countMap[String(cid)] ?? 0;

          return {
            ...r,
            __commentCount:
              typeof serverCnt === "number" ? serverCnt : Number(apiCnt) || 0,
          };
        });

        setData(merged);
        setPage(1);
      } catch (e) {
        if (!alive) return;
        setLoadError(e?.message || "목록을 불러오지 못했어요.");
        setData([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  // 화면용 row
  const rows = useMemo(() => {
    const mapped = (data || []).map((r) => {
      const id = r.id ?? r.communityId ?? r.community_id;
      const title = r.title ?? "";
      const author =
        r.author?.name ??
        r.writer?.name ??
        r.member?.name ??
        r.authorName ??
        r.writerName ??
        "익명";
      const createdAt =
        r.createdAt ?? r.created_at ?? r.createdDate ?? r.createdDateTime ?? "";
      const comments =
        r.__commentCount ??
        r.comments ??
        r.commentCount ??
        r.comment_count ??
        r.commentCnt ??
        0;
      const pinned = r.pinned ?? r.isPinned ?? false;

      return { id, title, author, createdAt, comments, pinned };
    });

    const keyword = q.trim().toLowerCase();
    let filtered = mapped.filter((r) => {
      if (!keyword) return true;
      return (
        (r.title || "").toLowerCase().includes(keyword) ||
        (r.author || "").toLowerCase().includes(keyword)
      );
    });

    const pinned = filtered.filter((r) => r.pinned);
    const normal = filtered.filter((r) => !r.pinned);

    const sorter = (a, b) => {
      if (sort === "comments") return (b.comments || 0) - (a.comments || 0);
      const at = Date.parse(a.createdAt || "") || 0;
      const bt = Date.parse(b.createdAt || "") || 0;
      if (bt !== at) return bt - at;
      return (b.id || 0) - (a.id || 0);
    };

    pinned.sort(sorter);
    normal.sort(sorter);

    return [...pinned, ...normal];
  }, [data, q, sort]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  function onEdit(e, row) {
    e.stopPropagation();
    if (row?.id == null) {
      alert("id가 없어서 수정 페이지로 이동할 수 없어요.");
      return;
    }
    router.push(`/board-write?id=${row.id}`);
  }

  async function onDelete(e, row) {
    e.stopPropagation();
    if (row?.id == null) {
      alert("id가 없어서 삭제할 수 없어요.");
      return;
    }
    const ok = window.confirm("정말 삭제할까요?");
    if (!ok) return;

    try {
      await deleteCommunity(row.id, token);
    } catch (err) {
      console.error("[DELETE API ERROR]", err);
      alert(err?.message || "삭제 실패");
    }
  }

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="자유게시판">
      <div className="h-full w-full bg-white rounded-xl overflow-hidden">
        <div className="px-10 py-6 border-neutral-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-neutral-600" />
              <h1 className="text-2xl font-semibold text-neutral-900">
                자유게시판
              </h1>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              업무 공유 / 질문 / 팁 까지 편하게 올려주세요.
            </p>
          </div>
        </div>

        <div className="px-10 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="text-xs text-neutral-500">
              총 <span className="font-semibold text-neutral-700">{total}</span>
              건
            </div>

            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="제목/작성자 검색"
              className="h-7 w-55 px-3 rounded-md border border-neutral-200 bg-white text-[11px] outline-none"
            />

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-7 px-3 rounded-md border border-neutral-200 bg-white text-[11px] outline-none"
            >
              <option value="latest">최신순</option>
              <option value="comments">댓글순</option>
            </select>
          </div>

          <button
            type="button"
            onClick={goWrite}
            className="shrink-0 h-8 px-3 rounded-md bg-slate-900 text-white text-sm font-medium
                       hover:bg-slate-800 active:scale-[0.99] flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            글쓰기
          </button>
        </div>

        {!loading && pageRows.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-neutral-500">
            게시글이 없어요.
          </div>
        )}

        {!loading && pageRows.length > 0 && (
          <div className="px-10">
            <div
              className={
                GRID +
                " px-6 h-12 items-center bg-neutral-200 text-neutral-700 text-sm font-semibold"
              }
            >
              <div className="text-center pr-2">번호</div>
              <div className="pl-2">제목</div>
              <div className="pl-2">작성자</div>
              <div className="pl-2">작성일</div>
              <div className="text-right pr-2">댓글</div>
              <div className="text-center">수정 · 삭제</div>
            </div>
            {pageRows.map((r, idx) => (
              <button
                key={r.id}
                type="button"
                className={ROW_BASE}
                onClick={() => openPost(r.id)}
              >
                <div className="flex items-center justify-center text-sm text-neutral-500 pr-2">
                  {start + idx + 1}
                </div>
                <div className="min-w-0 pl-2">
                  <span className="truncate text-sm text-neutral-900 font-medium">
                    {r.title}
                  </span>
                </div>
                <div className="text-sm text-neutral-700 truncate pl-2">
                  {r.author}
                </div>
                <div className="text-sm text-neutral-500 truncate pl-2">
                  {fmtDate(r.createdAt)}
                </div>
                <div className="text-sm text-neutral-600 text-right pr-2">
                  {r.comments}
                </div>
                <div className="flex items-center justify-center gap-2 pr-2">
                  {canWriteCommunity ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => onEdit(e, r)}
                        className="h-8 px-2 text-xs text-gray-400 hover:text-black flex items-center cursor-pointer gap-1"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onDelete(e, r)}
                        className="h-8 px-2 text-xs text-gray-400 hover:text-red-600 flex items-center cursor-pointer gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-neutral-400">-</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
