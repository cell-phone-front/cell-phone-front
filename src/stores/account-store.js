import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAccount = create(
  persist(
    function (set) {
      return {
        account: null, // 현재 로그인한 계정 정보 저장

        clearAccount: function () {
          set({ account: null }); // 계정 정보 삭제
        },

        setAccount: function (newAccount) {
          set({ account: newAccount }); // 계정 정보 설정
        },
      };
    },
    {
      name: "account", /// localStorage key
    },
  ),
);

export const useToken = create(
  persist(
    function (set) {
      return {
        token: null, // 로그인 토큰 저장

        clearToken: function () {
          set({ token: null }); // 토큰 삭제
        },

        setToken: function (newToken) {
          set({ token: newToken }); // 토큰 저장
        },
      };
    },
    {
      name: "token", // localStorage key
    },
  ),
);
