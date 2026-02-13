// pages/notice-write.js
import React, { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { useRouter } from "next/router";
import { useAccount, useToken } from "@/stores/account-store";
import {
  createNotice,
  getNoticeById,
  updateNotice,
  uploadNoticeFiles,
  deleteNoticeAttachment,
} from "@/api/notice-api";
import {
  Pin,
  Paperclip,
  X,
  Upload,
  Save,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

function canEdit(role) {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "planner";
}

function normalizeExistingFiles(item) {
  const raw =
    item?.attachments ||
    item?.files ||
    item?.attachedFiles ||
    item?.attachmentsList ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((f) => {
      if (!f) return null;
      if (typeof f === "string") {
        return { id: null, name: f.split("/").pop(), url: f };
      }
      return {
        id: f.id ?? f.fileId ?? f._id ?? null,
        name:
          f.name ??
          f.filename ??
          f.originalName ??
          f.fileName ??
          (f.url ? f.url.split("/").pop() : "파일"),
        url: f.url ?? f.path ?? f.fileUrl ?? null,
      };
    })
    .filter(Boolean);
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return null;
}

function pickNoticeId(created) {
  const base = created?.notice || created?.data || created?.result || created;
  const id = pickFirst(base, [
    "id",
    "noticeId",
    "notice_id",
    "noticeNo",
    "notice_no",
    "_id",
  ]);
  return id != null ? String(id) : null;
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

  const noticeId = router.query?.id ? String(router.query.id) : null;
  const isEdit = Boolean(noticeId);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedAttachments, setRemovedAttachments] = useState([]);
  const [pinned, setPinned] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const MAX_DESC = 255;
  const memberId = account?.id;

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace("/login");
    else if (!allowed) router.replace("/notice");
  }, [hydrated, token, allowed, router]);

  // 수정 모드면 상세 불러오기
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
        setExistingFiles(normalizeExistingFiles(item));
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
    if (title.trim() || content.trim() || files.length > 0) {
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
    if (!memberId && !isEdit)
      return setError("memberId가 없습니다. 로그인 정보를 확인해주세요.");

    setSaving(true);

    try {
      const payload = {
        title: t,
        content: c,
        memberId,
        pinned,
        isPinned: pinned,
        // ✅ 백엔드가 지원하면 이걸로도 삭제 가능
        deleteAttachmentIds: removedAttachments,
      };

      let targetId = null;

      if (isEdit) {
        // ✅ 1) 삭제 API를 실제로 호출 (id만 있을 때만)
        const ids = (removedAttachments || []).filter(
          (x) => x != null && x !== "",
        );
        if (ids.length > 0) {
          await Promise.all(
            ids.map((attId) => deleteNoticeAttachment(noticeId, attId, token)),
          );
        }

        // ✅ 2) 본문 + 새 파일(멀티파트) 수정 (한 번만!)
        await updateNotice(noticeId, payload, files, token);
        targetId = String(noticeId);
      } else {
        // 생성
        const created = await createNotice(payload, token);
        targetId = pickNoticeId(created);

        if (!targetId) {
          throw new Error(
            "공지 저장 후 id를 찾지 못했습니다. createNotice 응답을 확인해주세요.",
          );
        }

        // 생성 시 파일 업로드 별도
        if (Array.isArray(files) && files.length > 0) {
          await uploadNoticeFiles(targetId, files, token);
        }
      }

      alert(isEdit ? "수정 완료!" : "등록 완료!");
      router.push("/notice");
    } catch (err) {
      console.error(err);
      setError(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const pageTitle = isEdit ? "공지사항 수정" : "공지사항 작성";
  const pageDesc = isEdit
    ? "공지 내용을 수정하고 첨부파일을 관리합니다."
    : "공지사항 제목/내용을 작성하고 첨부파일을 추가합니다.";

  const fileCountLabel =
    files.length > 0 ? `${files.length}개 선택됨` : "파일을 선택하세요";

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent={pageTitle}>
      <div className="w-full min-h-[calc(100vh-120px)] overflow-x-hidden px-5">
        <div className="w-full py-5 min-w-0">
          {/* 상단 헤더 카드 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full min-w-0">
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="h-13 w-13 rounded-xl bg-indigo-100 grid place-items-center shadow-sm">
                      <Pin className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-semibold tracking-tight text-slate-900">
                        공지사항
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

                  <button
                    type="button"
                    onClick={() => setPinned((p) => !p)}
                    className={[
                      "h-9 px-4 rounded-lg border text-sm font-semibold transition inline-flex items-center gap-2",
                      pinned
                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:bg-slate-100",
                    ].join(" ")}
                    title="상단 고정 토글"
                  >
                    <Pin className="h-4 w-4" />
                    고정
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
                    80자 이내
                  </div>
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="공지사항 제목을 입력하세요"
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
                    {content.length}/{MAX_DESC}자
                  </div>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="공지사항 내용을 입력하세요"
                  className="
                    h-[180px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3
                    text-sm text-slate-900
                    outline-none transition
                    hover:border-slate-300
                    focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300
                    placeholder:text-slate-400
                    resize-none
                  "
                  maxLength={MAX_DESC}
                />
              </div>

              {/* 첨부파일 */}
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Paperclip className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-black text-slate-700">
                        첨부파일
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        새 파일 추가 및 기존 파일 제거를 한 곳에서 관리합니다.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-[12px] font-semibold text-slate-700">
                      {files.length > 0
                        ? `${files.length}개 선택됨`
                        : "파일 선택"}
                    </div>

                    <label
                      className="
          h-9 px-4 rounded-lg border border-slate-200 bg-white
          text-sm font-semibold text-slate-700
          hover:bg-slate-50 active:bg-slate-100 transition
          cursor-pointer inline-flex items-center gap-2 shrink-0
        "
                    >
                      <Upload className="h-4 w-4" />
                      파일 선택
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) =>
                          setFiles(Array.from(e.target.files || []))
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* ✅ 통합 리스트(한 번만 스크롤) */}
                <div
                  className="
      mt-2 rounded-xl border border-slate-200 bg-slate-50
      px-4 py-3 min-w-0
      max-h-[220px] overflow-y-auto pr-1
    "
                >
                  {/* 섹션이 완전히 비었을 때 */}
                  {files.length === 0 && existingFiles.length === 0 ? (
                    <div className="py-6 text-center text-[12px] text-slate-500">
                      첨부된 파일이 없습니다. 우측 상단에서 파일을 선택해
                      추가하세요.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* ✅ 새로 선택한 파일 */}
                      {files.length > 0 ? (
                        <div>
                          <div className="mb-2 text-[11px] font-black text-slate-600">
                            새로 추가할 파일
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            {files.map((f) => (
                              <div
                                key={f.name + String(f.size)}
                                className="
                    flex items-center justify-between gap-2
                    rounded-lg bg-white border border-slate-200
                    px-3 py-2 min-w-0
                  "
                              >
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="text-[12px] font-semibold text-slate-800 truncate"
                                    title={f.name}
                                  >
                                    {f.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 tabular-nums">
                                    {(f.size / 1024).toFixed(1)} KB
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setFiles((prev) =>
                                      prev.filter((x) => x !== f),
                                    )
                                  }
                                  className="
                      h-8 w-8 rounded-lg grid place-items-center
                      text-slate-400 hover:text-rose-600 hover:bg-rose-50
                      transition shrink-0
                    "
                                  title="제거"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* ✅ 기존 첨부파일 */}
                      {existingFiles.length > 0 ? (
                        <div>
                          <div className="mb-2 flex items-center gap-3">
                            <div className="text-[11px] font-black text-slate-600">
                              기존 첨부파일
                            </div>

                            {removedAttachments.length > 0 && (
                              <div className="text-[11px] text-slate-400">
                                제거 표시: {removedAttachments.length}개
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            {existingFiles.map((f) => {
                              const key = f.id ?? f.url ?? f.name;

                              return (
                                <div
                                  key={key}
                                  className="
                      flex items-center justify-between gap-2
                      rounded-lg bg-white border border-slate-200
                      px-3 py-2 min-w-0
                    "
                                >
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className="text-[12px] font-semibold text-slate-800 truncate"
                                      title={f.name}
                                    >
                                      {f.name}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      기존 파일
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      // 1) 화면에서 제거(표시용)
                                      setExistingFiles((prev) =>
                                        prev.filter((x) => x.id !== f.id),
                                      );

                                      // 2) 실제 삭제 대상 목록에 추가(id 있을 때만, 중복 방지)
                                      if (f?.id != null && f.id !== "") {
                                        setRemovedAttachments((prev) =>
                                          prev.includes(f.id)
                                            ? prev
                                            : prev.concat(f.id),
                                        );
                                      }
                                    }}
                                    className="
    h-8 w-8 rounded-lg grid place-items-center
    text-slate-400 hover:text-rose-600 hover:bg-rose-50
    transition shrink-0
  "
                                    title="제거"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white px-6 mb-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="
                  h-10 px-5 rounded-xl border border-slate-200 bg-white
                  text-sm font-semibold text-slate-700
                  hover:bg-slate-50 active:bg-slate-100 transition
                "
              >
                취소
              </button>

              <button
                type="submit"
                disabled={saving || !isValid || loading}
                className={[
                  "h-10 px-5 rounded-xl text-sm font-semibold transition inline-flex items-center gap-2",
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
        </div>
      </div>
    </DashboardShell>
  );
}
