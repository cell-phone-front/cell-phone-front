// src/lib/notice-util.js

export function fmtDate(v) {
  if (!v) return "-";
  const s = String(v);
  let d = s;
  if (d.includes("T")) d = d.split("T")[0];
  else if (d.includes(" ")) d = d.split(" ")[0];
  else d = d.slice(0, 10);
  return d.replaceAll("-", ".");
}

export function safeLower(v) {
  return String(v ?? "").toLowerCase();
}

export function isPinned(n) {
  const v =
    n?.pinned ??
    n?.isPinned ??
    n?.pin ??
    n?.fixed ??
    n?.top ??
    n?.topFixed ??
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

export function getId(n) {
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

export function getRowKey(n, idx) {
  const id = getId(n);
  if (id != null) return `notice-${id}`;
  return `notice-x-${n?.createdAt ?? "noDate"}-${n?.title ?? "noTitle"}-${idx}`;
}

export function normalizeFiles(n) {
  const raw =
    n?.attachments ||
    n?.files ||
    n?.attachedFiles ||
    n?.attachmentsList ||
    n?.fileList ||
    n?.existingFiles ||
    n?.noticeAttachmentList || // ✅ 추가
    n?.attachmentList || // ✅ 추가
    n?.noticeAttachments || // ✅ 추가
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((f) => {
      if (!f) return null;

      if (typeof f === "string") {
        return { id: null, name: f.split("/").pop(), url: f };
      }

      return {
        // ✅ 다운로드용 PK 우선
        id:
          f.noticeAttachmentId ??
          f.attachmentId ??
          f.id ?? // ✅ 그 다음
          f.fileId ??
          f._id ??
          null,

        name:
          f.name ??
          f.filename ??
          f.originalName ??
          f.fileName ??
          f.storedName ??
          (f.url ? f.url.split("/").pop() : "파일"),

        url: f.url ?? f.path ?? f.fileUrl ?? f.downloadUrl ?? null,
      };
    })
    .filter(Boolean);
}

export function normalizeRow(raw = {}) {
  const pinned = isPinned(raw);

  return {
    id: getId(raw) ?? raw.no ?? null,
    title: raw.title ?? raw.subject ?? "",
    content: raw.content ?? raw.body ?? raw.description ?? "",
    memberName: raw.memberName ?? raw.writer ?? raw.author ?? "",
    createdAt:
      raw.createdAt ?? raw.createAt ?? raw.createdDate ?? raw.date ?? "",
    views: raw.views ?? raw.viewCount ?? raw.hit ?? raw.readCount ?? 0,
    pinned,
    files: normalizeFiles(raw),
    attachments: raw.attachments ?? raw.files ?? raw.fileList ?? [],
    ...raw,
    pinned,
    files: normalizeFiles(raw),
  };
}

export function getWriter(n) {
  return (
    n?.memberName ||
    n?.writer ||
    n?.author ||
    n?.name ||
    n?.member?.name ||
    n?.memberId ||
    n?.member_id ||
    n?.member?.id ||
    "-"
  );
}

export function getViews(n) {
  const v =
    n?.views ??
    n?.viewCount ??
    n?.view ??
    n?.view_count ??
    n?.hit ??
    n?.hits ??
    n?.readCount ??
    n?.read_count;
  return v ?? 0;
}
