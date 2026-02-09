// pages/board-write/index.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useRouter } from "next/router";
import {
  MessageSquareText,
  ArrowLeft,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  getCommunityById,
  putCommunity,
  postCommunity,
} from "@/api/community-api";
import { useAccount, useToken } from "@/stores/account-store";

function canWrite(role) {
  const r = String(role || "").toLowerCase();
  return r === "planner" || r === "worker";
}

export default function BoardWrite() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const role = useMemo(
    () => String(account?.role || "").toLowerCase(),
    [account],
  );
  const allowed = canWrite(role);

  const communityId = router.query?.id ? String(router.query.id) : null;
  const isEdit = Boolean(communityId);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const authorName = useMemo(() => account?.name || "익명", [account]);

  // 권한/로그인 가드
  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace("/login");
    else if (!allowed) router.replace("/board");
  }, [hydrated, token, allowed, router]);

  // 수정 모드: 기존 글 로드
  useEffect(() => {
    if (!hydrated) return;
    if (!token) return;
    if (!allowed) return;
    if (!isEdit) return;

    let alive = true;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const detail = await getCommunityById(communityId, token);
        const item = detail?.board || detail?.data || detail;

        if (!alive) return;

        setTitle(String(item?.title || ""));
        setContent(String(item?.content || item?.description || ""));
      } catch (e) {
        console.error(e);
        if (alive) setError(e?.message || "글 상세를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [hydrated, token, allowed, isEdit, communityId]);

  if (!hydrated) return null;
  if (!token) return null;
  if (!allowed) return null;

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  function onCancel() {
    if (title.trim() || content.trim()) {
      const ok = window.confirm(
        "작성/수정 중인 내용이 사라집니다. 취소할까요?",
      );
      if (!ok) return;
    }
    router.push("/board");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const t = title.trim();
    const c = content.trim();

    if (!t) return setError("제목을 입력해주세요.");
    if (!c) return setError("내용을 입력해주세요.");
    if (!token) return setError("토큰이 없습니다. 다시 로그인 해주세요.");

    setSaving(true);

    try {
      if (isEdit) {
        await putCommunity(communityId, { title: t, content: c }, token);
        alert("수정 완료!");
      } else {
        await postCommunity({ title: t, content: c }, token);
        alert("작성 완료!");
      }
      router.push("/board");
    } catch (err) {
      console.error(err);
      setError(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const pageTitle = isEdit ? "자유게시판 수정" : "자유게시판 작성";
  const pageDesc = isEdit
    ? "게시글 내용을 수정합니다."
    : "게시글 제목/내용을 작성합니다.";

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent={pageTitle}>
      <div className="w-full min-h-[calc(100vh-120px)] overflow-x-hidden">
        <div className="w-full py-5 min-w-0">
          {/* 상단 헤더 카드 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full min-w-0">
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="h-13 w-13 rounded-xl bg-indigo-100 grid place-items-center shadow-sm">
                      <MessageSquareText className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-semibold tracking-tight text-slate-900">
                        {pageTitle}
                      </div>
                      <p className="mt-1 text-[12px] text-slate-500 font-medium">
                        {pageDesc}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="
                      h-9 px-4 rounded-lg border border-slate-200 bg-white
                      text-sm font-semibold text-slate-700
                      hover:bg-slate-50 active:bg-slate-100 transition
                      inline-flex items-center gap-2
                    "
                  >
                    <ArrowLeft className="h-4 w-4" />
                    목록
                  </button>
                </div>
              </div>
            </div>

            {(loading || error) && (
              <div className="px-6 py-4">
                {loading ? (
                  <div className="text-sm text-slate-500">불러오는 중...</div>
                ) : null}
                {error ? (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="break-words">{error}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* 폼 카드 */}
          <form
            onSubmit={onSubmit}
            className="
              mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm
              overflow-hidden w-full min-w-0
            "
          >
            <div className="px-6 py-4">
              {/* 제목 */}
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="text-[12px] font-black text-slate-700">
                    제목
                  </label>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {title.length}/80자
                  </div>
                </div>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="
                    h-11 w-full rounded-xl border border-slate-200 bg-white px-4
                    text-sm text-slate-900
                    outline-none transition
                    hover:border-slate-300
                    focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                    placeholder:text-slate-400
                  "
                  maxLength={80}
                />
              </div>

              {/* 내용 */}
              <div className="mt-4 space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="text-[12px] font-black text-slate-700">
                    내용
                  </label>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {content.length}/255자
                  </div>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="내용을 입력하세요"
                  className="
                    h-[260px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3
                    text-sm text-slate-900
                    outline-none transition
                    hover:border-slate-300
                    focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                    placeholder:text-slate-400
                    resize-none
                  "
                  maxLength={255}
                />
              </div>
            </div>

            {/* 하단 액션 */}
            <div className="border-t border-slate-100 bg-white px-6 py-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="
                  h-10 px-5 rounded-xl border border-slate-200 bg-white
                  text-sm font-black text-slate-700
                  hover:bg-slate-50 active:bg-slate-100 transition
                "
              >
                취소
              </button>

              <button
                type="submit"
                disabled={saving || !isValid || loading}
                className={[
                  "h-10 px-5 rounded-xl text-sm font-black transition inline-flex items-center gap-2",
                  saving || !isValid || loading
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer",
                ].join(" ")}
              >
                <Save className="h-4 w-4" />
                {saving ? "저장중..." : isEdit ? "수정" : "등록"}
              </button>
            </div>
          </form>

          <div className="h-8" />
        </div>
      </div>
    </DashboardShell>
  );
}
