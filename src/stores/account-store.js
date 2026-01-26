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
    }
  )
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
    }
  )
);

export const useAccommodation = create(
  persist(
    function (set) {
      return {
        accommodation: null,

        clearAccommodation: function () {
          set({ accommodation: null });
        },

        // setAccommodation: function (newAccommodation) {
        //   set({ accommodation: newAccommodation });
        // },

        // setAccommodation: function (fn) {
        //   const ret = fn(accommodation);
        //   set({ accommodation: ret });
        // }, // 이건 문법 오류.. 위 or 아래껄로 사용

        setAccommodation: function (func) {
          set((state) => ({
            accommodation: func(state.accommodation),
          }));
        },
      };
    },
    {
      name: "accommodation",
    }
  )
);

export const useAmenities = create(
  persist(
    function (set) {
      return {
        amenities: [],

        clearAmenities: function () {
          set({ amenities: [] });
        },

        setAmenities: function (func) {
          set((state) => ({
            amenities: func(state.amenities),
          }));
        },
      };
    },
    {
      name: "amenities",
    }
  )
);

export const useImage = create(function (set) {
  return {
    image: [],

    clearImage: function () {
      set({ images: [] });
    },

    setImage: function (func) {
      console.log;
      set((state) => ({
        image: func(state.image),
      }));
    },
  };
});

export const useTags = create(
  persist(
    function (set) {
      return {
        tags: [],

        clearTags: function () {
          set({ tags: [] });
        },

        setTags: function (func) {
          set((state) => ({
            tags: func(state.tags),
          }));
        },
      };
    },
    {
      name: "tags",
    }
  )
);

export const useRoom = create(
  function (set) {
    return {
      room: {
        id: "",
        hostId: "",
        name: "",
        description: "",
        price: 0,
        address: "",
        extraRate: 0.0,
        maxCapacity: 0,
        bedroom: 0,
        bed: 0,
        bathroom: 0,
        images: [],
        tags: [],
        likes: 0,
        amenities: [],
      },

      clearRoom: function () {
        set({
          room: {
            id: "",
            hostId: "",
            name: "",
            description: "",
            price: 0,
            address: "",
            extraRate: 0.0,
            maxCapacity: 0,
            bedroom: 0,
            bed: 0,
            bathroom: 0,
            images: [],
            tags: [],
            likes: 0,
            amenities: [],
          },
        });
      },

      setRoom: (room) => set({ room }),

      updateRoom: function (func) {
        set((state) => ({
          room: func(state.room),
        }));
      },
    };
  },
  {
    name: "room",
  }
);
