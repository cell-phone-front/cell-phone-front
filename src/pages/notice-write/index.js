// pages/notice-write.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useRouter } from "next/router";
import { useAccount, useToken } from "@/stores/account-store";
import { createNotice, getNoticeById, updateNotice } from "@/api/notice-api";

function canEdit(role) {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "planner";
}

export default function NoticeWrite() {
  const router = useRouter();
  const { account } = useAccount();
  const { token } = useToken();

  const role = useMemo(
    () => String(account?.role || "").toLowerCase(),
    [account],
  );
  const allowed = canEdit(role);

  //  query id (수정 모드)
  const noticeId = router.query?.id ? String(router.query.id) : null;
  const isEdit = Boolean(noticeId);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [pinned, setPinned] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const MAX_DESC = 255;
  const memberId = account?.id;

  // ✅ 권한 체크
  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace("/login");
    else if (!allowed) router.replace("/notice"); // 권한 없으면 리스트로
  }, [hydrated, token, allowed, router]);

  // ✅ 수정 모드면 상세 불러와서 폼 채우기
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
        const detail = await getNoticeById(noticeId, token);
        const item = detail?.notice || detail?.data || detail;

        if (!alive) return;

        setTitle(String(item?.title || ""));
        setContent(String(item?.content || item?.description || ""));
        const p =
          item?.pinned ??
          item?.isPinned ??
          item?.pin ??
          item?.pinnedYn ??
          item?.pinned_yn;
        setPinned(p === true || p === 1 || String(p).toLowerCase() === "y");
      } catch (e) {
        console.error(e);
        if (alive) setError(e?.message || "공지 상세를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [hydrated, token, allowed, isEdit, noticeId]);

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
    router.push("/notice");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const t = title.trim();
    const c = content.trim();

    if (!t) return setError("제목을 입력해주세요.");
    if (!c) return setError("내용을 입력해주세요.");
    if (!token) return setError("토큰이 없습니다. 다시 로그인 해주세요.");

    // 작성일 때만 memberId 필수로 묶고 싶으면 이렇게:
    if (!memberId && !isEdit) {
      return setError("memberId가 없습니다. 로그인 정보를 확인해주세요.");
    }

    setSaving(true);

    try {
      const payload = {
        title: t,
        content: c,
        // 백이 memberId를 수정에서도 요구하면 isEdit이어도 넣어줘
        memberId: memberId,
        pinned: pinned ? 1 : 0,
      };

      if (isEdit) {
        await updateNotice(noticeId, payload, token);
        alert("수정 완료!");
      } else {
        const createdNotice = await createNotice(payload, token);
        targetId = createdNotice?.id;
        alert("등록 완료!");
      }

      if (files.length > 0 && targetId) {
        await uploadNoticeFiles(noticeId, files, token);
      }

      alert("저장 완료!");
      router.push("/notice");
    } catch (err) {
      console.error(err);
      setError(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      crumbTop="게시판"
      crumbCurrent={isEdit ? "공지사항 수정" : "공지사항 작성"}
    >
      <div className="w-full h-full flex flex-col gap-4">
        <div className="bg-white rounded-xl px-10 py-5">
          <h1 className="text-xl font-bold">
            {isEdit ? "공지사항 수정" : "공지사항 작성"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? "공지 내용을 수정해주세요."
              : "공지사항 제목과 내용을 작성해주세요."}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-xl px-10 py-10 flex-1 flex flex-col gap-5"
        >
          {loading ? (
            <div className="text-sm text-gray-500">불러오는 중...</div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              id="pinned"
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="pinned" className="text-sm text-gray-700">
              상단 고정(📌)
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목을 입력하세요"
              className="h-10 px-3 border rounded-md text-sm outline-none"
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-semibold text-gray-700">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지사항 내용을 입력하세요"
              className="min-h-60 flex-1 px-3 py-3 border rounded-md text-sm outline-none resize-none"
              maxLength={MAX_DESC}
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">
                첨부파일
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files))}
              />
            </div>
            <div className="flex justify-end text-xs text-gray-400">
              {content.length}/{MAX_DESC}자
            </div>
          </div>

          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 border rounded-md text-sm hover:bg-gray-50"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={saving || !isValid || loading}
              className={`h-9 px-4 rounded-md text-sm transition
                ${
                  saving || !isValid || loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white hover:bg-gray-900 cursor-pointer"
                }`}
            >
              {saving ? "저장중..." : isEdit ? "수정" : "등록"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
