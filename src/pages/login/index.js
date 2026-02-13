import { useRouter } from "next/router";
import { useState } from "react";
import { useAccount, useToken } from "@/stores/account-store";
import { loginCheck } from "@/api/member-api";

const CONTAINER = "mx-auto w-full max-w-7xl px-15 ";

export default function Login() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [loginError, setLoginError] = useState(false);

  const { setAccount } = useAccount();
  const { setToken } = useToken();

  function submitHandle(evt) {
    evt.preventDefault();
    setLoginError(false);

    loginCheck(name, id).then((obj) => {
      if (!obj?.token) {
        setLoginError(true);
        return;
      }

      setLoginError(false);
      setToken(obj.token); // 토큰 저장
      setAccount(obj.member); // 계정 저장
      router.push("/dashboard");
    });
  }

  return (
    <div className="h-screen relative bg-white overflow-x-auto overflow-y-hidden">
      {/* 배경: 왼쪽 1/2 그라데이션 + 오른쪽 1/2 흰색 */}
      <div className="absolute inset-0 flex min-w-300">
        <div className="w-1/2 bg-linear-to-r from-sky-50  to-white" />
        <div className="w-1/2 bg-white" />
      </div>

      {/*  컨텐츠는 가운데로 */}
      <div className="relative">
        <div className={`${CONTAINER} min-w-300`}>
          <div className="min-h-screen flex items-center">
            <div className="w-full flex min-h-160">
              {/* 왼쪽: 그림 */}
              <div className="w-1/2 flex items-center justify-center">
                <img
                  src="/images/login-bp-1.png"
                  alt="Login illustration"
                  className="max-h-130 w-auto object-contain"
                  draggable={false}
                />
              </div>

              {/* 오른쪽: 폼 */}
              <div className="w-1/2 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  {/* 타이틀 */}
                  <div className="mb-10">
                    <h2 className="text-xl font-bold text-gray-900">로그인</h2>
                    <p className="mt-2 text-xs text-gray-500">
                      이름과 사원번호를 입력해주세요.
                    </p>
                  </div>

                  {/* 폼 */}
                  <form className="space-y-8" onSubmit={submitHandle}>
                    {/* 이름 */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">
                        이름
                      </label>
                      <input
                        type="text"
                        placeholder="이름을 입력하세요"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border-b border-gray-200 bg-transparent pb-3 text-sm outline-none
                                   focus:border-neutral-500 placeholder:text-gray-300"
                      />
                    </div>

                    {/* 사원번호 */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">
                        사원번호
                      </label>
                      <input
                        type="password"
                        placeholder="사원번호를 입력하세요"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        className="w-full border-b border-gray-200 bg-transparent pb-3 text-sm outline-none
                                     focus:border-neutral-500 placeholder:text-gray-300"
                      />
                    </div>
                    {loginError && (
                      <p className="text-xs text-red-500">
                        이름 또는 사원번호가 올바르지 않습니다.
                      </p>
                    )}

                    {/* 버튼 */}
                    <button
                      type="submit"
                      className="w-full bg-slate-800/95 py-3 text-sm font-semibold text-white
                               hover:bg-slate-900 active:scale-[0.99] cursor-pointer"
                    >
                      로그인
                    </button>
                  </form>

                  <p className="mt-8 text-center text-xs text-gray-400">
                    문제가 있으면 관리자에게 문의하세요.
                  </p>
                </div>
              </div>
            </div>
            {/*  Freepik 출처 (오른쪽 아래) */}
            <div className="absolute bottom-4 left-4">
              <div className="px-3 py-1 text-[9px] text-neutral-200">
                Background image by{" "}
                <a
                  href="https://www.freepik.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-neutral-400/50"
                >
                  Freepik
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
