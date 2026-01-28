import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Clock,
  Pin,
} from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";
import { useToken } from "@/stores/account-store";
import { getCommunities, getCommunityCommentCount } from "@/api/community-api";

export default function Board() {
  const router = useRouter();
  const { token } = useToken();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  //  서버에서 목록 + 댓글 수 불러오기
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

        // 댓글 수 병렬 조회 (id 뽑고, 없는건 스킵)
        const ids = arr
          .map((r) => r.id ?? r.communityId ?? r.community_id)
          .filter((v) => v != null);

        const pairs = await Promise.all(
          ids.map(async (cid) => {
            try {
              const res = await getCommunityCommentCount(cid, token);
              // 반환 방어: {count}, {commentCount}, number 등
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

        // data에 commentCount를 합쳐서 저장
        const merged = arr.map((r) => {
          const cid = r.id ?? r.communityId ?? r.community_id;
          const serverCnt =
            r.comments ?? r.commentCount ?? r.comment_count ?? r.commentCnt;
          const apiCnt = countMap[String(cid)] ?? 0;

          return {
            ...r,
            // 서버에 이미 count가 있으면 그걸 우선, 없으면 apiCnt
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

  // 화면용 row 매핑
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
      const views = r.views ?? r.viewCount ?? 0;

      //  여기! 댓글 수는 __commentCount를 사용
      const comments =
        r.__commentCount ??
        r.comments ??
        r.commentCount ??
        r.comment_count ??
        r.commentCnt ??
        0;

      const pinned = r.pinned ?? r.isPinned ?? false;

      return { id, title, author, createdAt, views, comments, pinned };
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
      if (sort === "views") return (b.views || 0) - (a.views || 0);
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
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rowNoBase = (safePage - 1) * pageSize;

  function goWrite() {
    router.push("/board/write");
  }

  function openPost(id) {
    if (id == null) return;
    router.push(`/board/${id}`);
  }

  return (
    <DashboardShell>
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
              <option value="views">조회순</option>
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

        {loading ? (
          <div className="px-10 py-6 text-sm text-neutral-500">
            불러오는 중...
          </div>
        ) : loadError ? (
          <div className="px-10 py-6 text-sm text-red-500">{loadError}</div>
        ) : null}

        <div className="min-h-0">
          <div className="hidden md:block">
            <div className="px-10">
              <div className="grid grid-cols-[60px_1fr_110px_140px_60px] px-8 py-2 text-[12px] font-medium bg-neutral-200">
                <div className="text-center">번호</div>
                <div>제목</div>
                <div>작성자</div>
                <div>작성일</div>
                <div className="text-right pr-2">댓글</div>
              </div>

              {pageRows.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-neutral-500">
                  {loading ? "불러오는 중..." : "게시글이 없어요."}
                </div>
              ) : (
                pageRows.map((r, idx) => (
                  <button
                    key={String(r.id)}
                    type="button"
                    onClick={() => openPost(r.id)}
                    className="w-full text-left grid grid-cols-[60px_1fr_110px_140px_60px] px-8 py-3 border-b border-neutral-100 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-center text-sm text-neutral-500">
                      {r.pinned ? (
                        <span className="text-amber-600 font-semibold">📌</span>
                      ) : (
                        rowNoBase + idx + 1
                      )}
                    </div>

                    <div className="min-w-0">
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

                    <div className="text-xs text-neutral-700 truncate">
                      {r.author}
                    </div>

                    <div className="text-xs text-neutral-500 flex items-center gap-2 min-w-0">
                      <Clock className="w-4 h-4 text-neutral-300 shrink-0" />
                      <span className="truncate">{r.createdAt}</span>
                    </div>

                    {/* ✅ 댓글 수 이제 서버에서 진짜로 가져온 값 */}
                    <div className="text-xs text-neutral-600 text-right pr-2">
                      {r.comments}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 모바일 */}
          <div className="md:hidden">
            {pageRows.length === 0 ? (
              <div className="px-5 py-16 text-center text-sm text-neutral-500">
                {loading ? "불러오는 중..." : "게시글이 없어요."}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {pageRows.map((r) => (
                  <button
                    key={String(r.id)}
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

                        <div className="mt-2 grid grid-cols-[110px_1fr_50px] gap-2 items-center pr-1">
                          <div className="text-sm text-neutral-700 truncate">
                            {r.author}
                          </div>
                          <div className="text-sm text-neutral-500 flex items-center gap-2 min-w-0">
                            <Clock className="w-4 h-4 text-neutral-300 shrink-0" />
                            <span className="truncate">{r.createdAt}</span>
                          </div>
                          <div className="text-sm text-neutral-600 text-right">
                            {r.comments}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-10 py-3 border-neutral-200 flex items-center">
          <div className="ml-auto flex items-center gap-6">
            <div className="text-xs text-neutral-500">
              {safePage} / {pageCount} 페이지
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[11px]
                 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[11px]
                 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
