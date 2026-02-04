import { useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { getMembers, parseMemberXLS, postMembers } from "@/api/member-api";

import { useToken } from "@/stores/account-store";

/** 전화번호 유틸: 하이픈/공백 제거 후 숫자만 11자리 */
function normalizePhone(v) {
  return String(v || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

/**  010 + 8자리 = 총 11자리 */
function isValidPhone(phone) {
  return /^010\d{8}$/.test(phone);
}

function isPhoneIncomplete(v) {
  if (!v) return false; // 비어있으면 OK
  return v.length !== 11; // 숫자 11자리 아니면 ❌
}

export default function Accounts() {
  const token = useToken((s) => s.token);

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(() => new Set());

  // pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fileRef = useRef();

  useEffect(() => {
    if (!token) return;

    getMembers(token)
      .then((json) => {
        const rows = (
          json.memberList ||
          json.members ||
          json.items ||
          json.data ||
          []
        ).map((r) => normalizeMember(r));

        setData(rows);
        setSelected(new Set());
        setPageIndex(0);
        setDirty(false);
      })
      .catch((err) => {
        console.error(err);
        window.alert("멤버 조회 실패: 콘솔 확인");
      });
  }, [token]);

  const totalRows = data.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  const pageRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, pageIndex, pageSize]);

  const selectedCount = selected.size;

  const isAllPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r._rid));

  const isSomePageSelected =
    pageRows.some((r) => selected.has(r._rid)) && !isAllPageSelected;

  const toggleAllPage = (checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => {
        if (checked) next.add(r._rid);
        else next.delete(r._rid);
      });
      return next;
    });
  };

  const toggleOne = (_rid, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(_rid);
      else next.delete(_rid);
      return next;
    });
  };

  const updateCell = (rowRid, key, value) => {
    setData((prev) =>
      prev.map((r) => (r._rid === rowRid ? { ...r, [key]: value } : r)),
    );
    setDirty(true);
  };

  const addRow = () => {
    setData((prev) => [
      {
        _rid: cryptoId(),
        id: "",
        name: "",
        email: "",
        phoneNumber: "",
        dept: "",
        workTeam: "",
        role: "",
        hireDate: "",
        flag: "new",
      },
      ...prev,
    ]);
    setPageIndex(0);
    setSelected(new Set());
    setDirty(true);
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    setData((prev) => prev.filter((r) => !selected.has(r._rid)));
    setSelected(new Set());
    setPageIndex(0);
    setDirty(true);
  };

  /** saveHandle 하나만 남김 + 검증 + 하이픈 제거 후 저장 */
  const saveHandle = () => {
    //  저장 시점 검증(하이픈 제거한 값 기준)
    const invalidPhones = data.filter((r) => {
      const p = normalizePhone(r.phoneNumber);
      return r.phoneNumber && !isValidPhone(p);
    });

    if (invalidPhones.length > 0) {
      window.alert("전화번호는 010으로 시작하는 11자리 숫자여야 합니다.");
      return;
    }

    const payload = data.map(({ _rid, flag, ...rest }) => ({
      ...rest,
      phoneNumber: normalizePhone(rest.phoneNumber), // ✅ 저장은 숫자만
      hireDate: rest.hireDate === "" ? null : rest.hireDate,
    }));

    postMembers(payload, token)
      .then((ok) => {
        window.alert(ok ? "저장 완료" : "저장 실패");
        if (ok) setDirty(false);
      })
      .catch((err) => {
        console.error(err);
        window.alert("저장 실패: 콘솔 확인");
      });
  };

  const uploadHandle = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const fileChangeHandle = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    parseMemberXLS(file, token)
      .then((json) => {
        const items = (
          json.memberList ||
          json.items ||
          json.members ||
          json.data ||
          []
        ).map((r) => ({
          ...normalizeMember(r),
          _rid: cryptoId(),
          flag: "pre",
        }));

        setData((prev) => [...items, ...prev]);
        setPageIndex(0);
        setSelected(new Set());
        setDirty(true);
      })
      .catch((err) => {
        console.error(err);
        window.alert("엑셀 파싱 실패: 콘솔 확인");
      });

    e.target.value = "";
  };

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  return (
    <DashboardShell crumbTop="관리" crumbCurrent="accounts">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4 px-3 py-3">
        <div className="flex justify-between gap-4 items-center">
          <h2 className="text-2xl font-bold tracking-tight">Accounts</h2>
          <p className="mt-1 text-xs text-gray-500">
            계정 생성/편집 후 저장할 수 있어요.
          </p>
        </div>
      </div>

      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-3 px-4">
        {/* 왼쪽 */}
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
          <span>총 {totalRows.toLocaleString()}건</span>
          <span className="mx-1 h-4 w-px bg-gray-200" />
          <span>선택 {selectedCount.toLocaleString()}건</span>
          <span className="mx-1 h-4 w-px bg-gray-200" />

          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedCount === 0}
            className={[
              "h-8 rounded-md border px-3 text-sm transition",
              selectedCount === 0
                ? "bg-white text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                : "bg-white text-red-500 border-red-200 hover:bg-red-50 cursor-pointer",
            ].join(" ")}
          >
            선택 삭제
          </button>
        </div>

        {/* 오른쪽 */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="h-8 rounded-md border transition border-blue-200 text-blue-500 bg-white px-4 text-sm hover:bg-blue-50 cursor-pointer"
          >
            + 행 추가
          </button>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".xls,.xlsx"
            onChange={fileChangeHandle}
          />

          <button
            type="button"
            onClick={uploadHandle}
            className="h-8 rounded-md border px-3 text-sm bg-white hover:bg-gray-200 cursor-pointer transition"
          >
            XLS 업로드
          </button>

          <button
            type="button"
            onClick={saveHandle}
            disabled={!dirty}
            className={[
              "h-8 rounded-md border px-7 text-sm font-medium transition",
              dirty
                ? "bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
                : "bg-slate-200 text-slate-500 border-slate-200 cursor-not-allowed",
            ].join(" ")}
          >
            저장
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="px-4 pt-4">
        <div className="h-full overflow-auto bg-white">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-gray-200">
              <tr className="text-left text-sm">
                <th className="w-11 border-b px-3 py-3">
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-black"
                      checked={isAllPageSelected}
                      ref={(el) => {
                        if (!el) return;
                        el.indeterminate = isSomePageSelected;
                      }}
                      onChange={(e) => toggleAllPage(e.target.checked)}
                    />
                  </div>
                </th>

                <th className="min-w-30 border-b px-3 py-3 font-medium">
                  Name
                </th>
                <th className="min-w-52.5 border-b px-3 py-3 font-medium">
                  Email
                </th>
                <th className="min-w-40 border-b px-3 py-3 font-medium">
                  Phone
                </th>
                <th className="min-w-32.5 border-b px-3 py-3 font-medium">
                  Department
                </th>
                <th className="min-w-27.5 border-b px-3 py-3 font-medium">
                  Team
                </th>
                <th className="min-w-33.75 border-b px-3 py-3 font-medium">
                  Role
                </th>
                <th className="min-w-35 border-b px-3 py-3 font-medium">
                  Hire Date
                </th>
                <th className="min-w-25 border-b px-3 py-3 font-medium">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {pageRows.map((row) => {
                const isUploaded = row.flag === "pre";
                const isNew = row.flag === "new";

                const rowBg = isUploaded
                  ? "bg-green-100/10"
                  : isNew
                    ? "bg-blue-100/30"
                    : "";

                /** (추가) 전화번호 입력 중에도 바로 빨간 테두리로 표시 */
                const phoneDigits = normalizePhone(row.phoneNumber);
                const hasPhone = phoneDigits.length > 0;
                const phoneInvalid = hasPhone && !isValidPhone(phoneDigits);

                return (
                  <tr
                    key={row._rid}
                    className={["hover:bg-slate-200/80", rowBg].join(" ")}
                  >
                    {/* 체크 */}
                    <td className="border-b px-3 py-2">
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-black"
                          checked={selected.has(row._rid)}
                          onChange={(e) =>
                            toggleOne(row._rid, e.target.checked)
                          }
                        />
                      </div>
                    </td>

                    {/* 이름 */}
                    <td className="border-b px-3 py-2">
                      <input
                        value={row.name ?? ""}
                        onChange={(e) =>
                          updateCell(row._rid, "name", e.target.value)
                        }
                        className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                        placeholder="이름"
                      />
                    </td>

                    {/* 이메일 */}
                    <td className="border-b px-3 py-2">
                      <input
                        value={row.email ?? ""}
                        onChange={(e) =>
                          updateCell(row._rid, "email", e.target.value)
                        }
                        className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                        placeholder="이메일"
                      />
                    </td>

                    {/* 전화 */}
                    <td className="border-b px-3 py-2">
                      {(() => {
                        const digits = normalizePhone(row.phoneNumber);
                        const touched = phoneTouched.has(row._rid);

                        // 포커스 빠진 뒤(touched) + 값이 있는데 11자리 아니면 빨강
                        const showRed =
                          touched && digits.length > 0 && digits.length !== 11;

                        return (
                          <input
                            value={row.phoneNumber ?? ""}
                            onChange={(e) =>
                              updateCell(
                                row._rid,
                                "phoneNumber",
                                normalizePhone(e.target.value),
                              )
                            }
                            onBlur={() =>
                              setPhoneTouched((prev) => {
                                const next = new Set(prev);
                                next.add(row._rid);
                                return next;
                              })
                            }
                            className={[
                              "h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white placeholder:text-[12px]",
                              showRed ? "border-red-400" : "",
                            ].join(" ")}
                            placeholder="하이픈(-) 생략"
                          />
                        );
                      })()}
                    </td>

                    {/* 부서 */}
                    <td className="border-b px-3 py-2">
                      <input
                        value={row.dept ?? ""}
                        onChange={(e) =>
                          updateCell(row._rid, "dept", e.target.value)
                        }
                        className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                        placeholder="부서"
                      />
                    </td>

                    {/* 팀 */}
                    <td className="border-b px-3 py-2">
                      <input
                        value={row.workTeam ?? ""}
                        onChange={(e) =>
                          updateCell(row._rid, "workTeam", e.target.value)
                        }
                        className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 placeholder:text-[12px] placeholder:text-gray-400 bg-white"
                        placeholder="팀"
                      />
                    </td>

                    {/* 권한 */}
                    <td className="border-b px-3 py-2">
                      <select
                        value={row.role ?? ""}
                        onChange={(e) =>
                          updateCell(row._rid, "role", e.target.value)
                        }
                        className={[
                          "h-9 w-full rounded-md border bg-white px-2 text-sm",
                          row.role ? "" : "text-gray-500",
                        ].join(" ")}
                      >
                        <option value="">-</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="PLANNER">PLANNER</option>
                        <option value="WORKER">WORKER</option>
                      </select>
                    </td>

                    {/* 입사일 */}
                    <td className="border-b px-3 py-2">
                      <input
                        type="date"
                        value={row.hireDate ?? ""}
                        onChange={(e) =>
                          updateCell(row._rid, "hireDate", e.target.value)
                        }
                        className="h-9 w-full rounded-md border px-2 outline-none focus:ring-1 focus:ring-black/10 bg-white"
                      />
                    </td>

                    {/* 상태 */}
                    <td className="border-b px-3 py-2">
                      {isUploaded ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                          Imported
                        </span>
                      ) : isNew ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                          New
                        </span>
                      ) : (
                        <span className="text-[11px] px-4 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          Saved
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-0">
                    <button
                      type="button"
                      onClick={addRow}
                      className="w-full px-4 py-10 text-center text-sm text-gray-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer"
                    >
                      <span className="font-medium text-blue-700">
                        클릭해서 행 추가
                      </span>{" "}
                      또는 XLS 업로드 해주세요.
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageIndex === 0}
            className={[
              "h-8 px-3 text-[12px] rounded-md transition",
              pageIndex === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200 active:font-medium cursor-pointer",
            ].join(" ")}
          >
            이전
          </button>

          <div className="min-w-20 text-center text-[13px]">
            <span className="font-medium">{pageIndex + 1}</span>
            <span className="text-gray-500"> / {pageCount}</span>
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={pageIndex >= pageCount - 1}
            className={[
              "h-8 px-3 text-[12px] rounded-md transition",
              pageIndex >= pageCount - 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200 active:font-medium cursor-pointer",
            ].join(" ")}
          >
            다음
          </button>
        </div>
      </div>

      <div className="h-4" />
    </DashboardShell>
  );
}

/** 서버 응답이 snake_case든 camelCase든 다 받아서 통일 */
function normalizeMember(r) {
  return {
    _rid: r._rid || cryptoId(),
    id: r.id ?? "",
    name: r.name ?? "",
    email: r.email ?? "",
    phoneNumber: r.phoneNumber ?? r.phone_number ?? "",
    dept: r.dept ?? "",
    workTeam: r.workTeam ?? r.work_team ?? "",
    role: r.role ?? "",
    hireDate: normalizeDate(
      r.hireDate ??
        r.hire_date ??
        r.hiredate ??
        r.joinDate ??
        r.join_date ??
        r.joinedAt ??
        r.hire_dt ??
        "",
    ),
    flag: r.flag ?? "Y",
  };
}

function normalizeDate(v) {
  if (v == null || v === "") return "";

  // 엑셀 Serial Date(숫자) 처리
  if (typeof v === "number") {
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "";
  }

  const s = String(v).trim();

  if (s.includes("T")) return s.split("T")[0];
  if (s.includes(" ")) return s.split(" ")[0];

  if (s.includes("/") || s.includes(".")) {
    const parts = s.split(/[/\.]/);
    if (parts.length >= 3) {
      const y = parts[0];
      const m = String(parts[1]).padStart(2, "0");
      const d = String(parts[2]).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  return s;
}

function cryptoId() {
  try {
    return (
      globalThis.crypto?.randomUUID?.() || `rid-${Date.now()}-${Math.random()}`
    );
  } catch {
    return `rid-${Date.now()}-${Math.random()}`;
  }
}
