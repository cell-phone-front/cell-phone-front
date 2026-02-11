// pages/notice/[id].js
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import DashboardShell from "@/components/dashboard-shell";
import NoticeModal from "@/components/notice/modal";

import { useToken } from "@/stores/account-store";
import { getNoticeById } from "@/api/notice-api";

/* ===============================
   utils (최소만)
=============================== */
function getId(n) {
  if (!n) return null;
  return (
    n.id ??
    n.noticeId ??
    n.notice_id ??
    n.noticeID ??
    n.noticeNo ??
    n.notice_no ??
    n._id ??
    null
  );
}

function isPinned(n) {
  const v =
    n?.pinned ??
    n?.isPinned ??
    n?.pin ??
    n?.fixed ??
    n?.top ??
    n?.pinnedYn ??
    n?.pinned_yn ??
    n?.noticePinned ??
    n?.notice_pinned;

  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "y" || s === "1" || s === "true";
  }
  return false;
}

function normalizeFiles(n) {
  const raw =
    n?.attachments ||
    n?.files ||
    n?.attachedFiles ||
    n?.attachmentsList ||
    n?.fileList ||
    n?.noticeAttachmentList ||
    n?.attachmentList ||
    n?.noticeAttachments ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((f) => {
      if (!f) return null;

      if (typeof f === "string") {
        return { id: null, name: f.split("/").pop(), url: f };
      }

      const id =
        f.id ??
        f.noticeAttachmentId ??
        f.attachmentId ??
        f.fileId ??
        f._id ??
        null;

      const url =
        f.url ??
        f.path ??
        f.fileUrl ??
        f.downloadUrl ??
        f.fileUri ??
        f.fileURI ??
        null;

      const name =
        f.name ??
        f.originalName ??
        f.filename ??
        f.fileName ??
        f.storedName ??
        (url ? String(url).split("/").pop() : "파일");

      return {
        id: id != null ? String(id) : null,
        name: String(name || "파일"),
        url: url ? String(url) : null,
      };
    })
    .filter(Boolean);
}

function normalizeRow(n) {
  const id = getId(n);
  return {
    ...n,
    id: id != null ? String(id) : null,
    pinned: isPinned(n),
    files: normalizeFiles(n),
  };
}

/* ===============================
   page
=============================== */
export default function NoticeModalRoutePage() {
  const router = useRouter();
  const token = useToken((s) => s.token);

  const noticeId = useMemo(() => {
    const v = router.query.id;
    return v != null ? String(v) : null;
  }, [router.query.id]);

  const [open, setOpen] = useState(true);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!noticeId) return;

    // /notice/123 페이지는 들어오면 무조건 모달 오픈
    setOpen(true);

    if (!token) return;

    getNoticeById(noticeId, token)
      .then((detail) => {
        const item = detail?.notice || detail?.data || detail;
        setNotice(normalizeRow(item || { id: noticeId }));
      })
      .catch((e) => {
        console.error("[NOTICE DETAIL ERROR]", e);
        setNotice({ id: noticeId, title: "불러오기 실패", content: "" });
      });
  }, [router.isReady, noticeId, token]);

  function closeModal() {
    setOpen(false);
    // 닫으면 목록으로
    router.push("/notice");
  }

  return (
    <DashboardShell crumbTop="게시판" crumbCurrent="공지사항">
      {/* 이 페이지는 “배경”이 없어도 되면 빈 화면이어도 OK */}
      <div className="h-full w-full" />

      <NoticeModal
        open={open}
        onClose={closeModal}
        notice={notice}
        token={token}
      />
    </DashboardShell>
  );
}
