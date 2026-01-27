import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import DashboardShell from "@/components/dashboard-shell";
import {
  Pin,
  Clock,
  MessageSquareText,
  ChevronLeft,
  Send,
  Trash2,
} from "lucide-react";

const MOCK = [
  {
    id: 101,
    pinned: true,
    title: " 공지: 자유게시판 이용 규칙",
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

function cryptoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function fmtNow() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function lsKey(postId) {
  return `board_comments_${postId}`;
}

function readComments(postId) {
  try {
    const raw = localStorage.getItem(lsKey(postId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeComments(postId, arr) {
  try {
    localStorage.setItem(lsKey(postId), JSON.stringify(arr));
  } catch {}
}

export default function BoardDetail() {
  const router = useRouter();
  const { id } = router.query;

  const post = useMemo(() => {
    const postId = Number(id);
    return MOCK.find((x) => x.id === postId);
  }, [id]);

  const postId = useMemo(() => Number(id), [id]);

  // comments state
  const [comments, setComments] = useState([]);
  const [author, setAuthor] = useState("totoro"); // 임시: 로그인 붙이면 여기서 가져오면 됨
  const [content, setContent] = useState("");

  // load from localStorage when ready
  useEffect(() => {
    if (!router.isReady) return;
    if (!postId) return;

    const loaded = readComments(postId);

    // 처음 들어왔는데 댓글이 하나도 없으면 샘플 2개만 만들어줌(원하면 삭제)
    if (loaded.length === 0) {
      const seed = [
        {
          cid: cryptoId(),
          author: "planner01",
          createdAt: "2026-01-26 09:30",
          content: "규칙 확인했습니다! 공정 관련 팁도 자주 올릴게요.",
        },
        {
          cid: cryptoId(),
          author: "totoro",
          createdAt: "2026-01-26 09:35",
          content: "고정글 좋아요. 질문 올릴 때 참고하겠습니다.",
        },
      ];
      writeComments(postId, seed);
      setComments(seed);
      return;
    }

    setComments(loaded);
  }, [router.isReady, postId]);

  // persist whenever comments change
  useEffect(() => {
    if (!router.isReady) return;
    if (!postId) return;
    writeComments(postId, comments);
  }, [comments, router.isReady, postId]);

  function goList() {
    router.push("/board");
  }

  function addComment() {
    const a = author.trim();
    const c = content.trim();

    if (!a) return alert("작성자 이름을 입력해줘!");
    if (!c) return alert("댓글 내용을 입력해줘!");

    const next = [
      ...comments,
      {
        cid: cryptoId(),
        author: a,
        createdAt: fmtNow(),
        content: c,
      },
    ];
    setComments(next);
    setContent("");
  }

  function removeComment(cid) {
    const next = comments.filter((x) => x.cid !== cid);
    setComments(next);
  }

  if (!router.isReady) return null;

  return (
    <DashboardShell>
      <div className="h-full w-full bg-white rounded-xl overflow-hidden">
        {/* header */}
        <div className="px-10 py-6  border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {post?.pinned && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border
                   border-amber-200 bg-amber-50 text-amber-700"
                  >
                    <Pin className="w-3 h-3" />
                    고정
                  </span>
                )}
                <h1 className="text-xl font-semibold text-neutral-900 truncate">
                  {post ? post.title : "글을 찾을 수 없어요"}
                </h1>
              </div>

              {post && (
                <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquareText className="w-4 h-4 text-neutral-300" />
                    {post.author}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-4 h-4 text-neutral-300" />
                    {post.createdAt}
                  </span>
                  <span>댓글 {comments.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* body */}
        <div className="px-10">
          {post ? (
            <>
              <div className=" border-neutral-200">
                {/* 본문 스크롤 영역 */}
                <div className="max-h-[250px] overflow-y-auto whitespace-pre-wrap text-sm text-neutral-700 leading-7">
                  {post.content || "(본문이 아직 없어요)"}
                </div>
              </div>

              {/* comments */}
              <div className="mt-8 px-5">
                <div className="flex items-start justify-between">
                  <h2 className="text-sm font-semibold text-neutral-900 mb-2">
                    댓글{" "}
                    <span className="text-neutral-500">
                      ({comments.length})
                    </span>
                  </h2>
                </div>

                {/* write box */}

                <div className=" flex flex-col md:flex-row gap-3">
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="작성자"
                    className="h-10 md:w-44 px-1 font-semibold rounded-md text-sm outline-none"
                  />
                  <div className="flex-1 flex gap-2 items-start">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={(e) => {
                        // Shift+Enter = 줄바꿈 (기본동작 그대로)
                        if (e.key === "Enter" && e.shiftKey) {
                          return;
                        }

                        // Enter = 등록
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addComment();
                        }
                      }}
                      placeholder="댓글을 입력하세요 (Enter=등록 / Shift+Enter=줄바꿈)"
                      rows={2}
                      className="min-h-15 flex-1 px-3 py-2 rounded-md border border-neutral-200 text-sm outline-none placeholder:text-[12px] resize-none"
                    />

                    {/* <button
                      type="button"
                      onClick={addComment}
                      className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium
                                  hover:bg-slate-800 active:scale-[0.99] flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      등록
                    </button> */}
                  </div>
                </div>
                {/* <p className="mt-2 text-[11px] text-neutral-500">
                  * 지금은 localStorage에 저장돼. 나중에 API 붙이면 그대로
                  교체하면 됨.
                </p> */}

                {/* list */}
                <div className="mt-4 overflow-hidden">
                  {/* 스크롤 영역 */}
                  <div className="max-h-[240px] overflow-y-auto divide-y divide-neutral-100">
                    {comments.length === 0 ? (
                      <div className="py-10 text-center text-sm text-neutral-500">
                        첫 댓글을 남겨보세요.
                      </div>
                    ) : (
                      comments
                        .slice()
                        .reverse()
                        .map((c) => (
                          <div
                            key={c.cid}
                            className="px-2 py-3 bg-white hover:bg-neutral-50
                            transition"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold text-neutral-900 truncate">
                                    {c.author}
                                  </div>
                                  <div className="text-xs text-neutral-500">
                                    {c.createdAt}
                                  </div>
                                </div>
                                <div className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">
                                  {c.content}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeComment(c.cid)}
                                className="shrink-0 h-8 w-8 rounded-md border border-neutral-200 bg-white
                         hover:bg-neutral-100 flex items-center justify-center"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4 text-neutral-500 hover:text-red-500 cursor-pointer" />
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-3 text-center text-sm text-neutral-500">
              해당 글이 없어요. (id: {id})
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
