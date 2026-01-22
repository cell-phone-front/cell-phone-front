import { Search } from "lucide-react";

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 flex items-center">
      <div className="w-full px-7 flex items-center justify-between gap-6">
        {/*  왼쪽: 로고 + 검색 */}
        <div className="flex items-center gap-23 flex-1">
          {/* 로고 */}
          <div className="h-16 flex items-center justify-center">
            <img
              src="/images/phoneflow-logo.png"
              alt="Logo"
              className="h-8 w-auto max-w-37.5 object-contain block"
              draggable={false}
            />
          </div>

          {/* 검색 */}
          <div className="flex-1 max-w-100">
            <div className="flex items-center gap-5 border border-neutral-200  bg-white px-3 h-10">
              <input
                className="w-full text-sm outline-none placeholder:text-neutral-400"
                placeholder="검색어를 입력하세요"
              />
              <Search className="w-4 h-4 text-neutral-400" />
            </div>
          </div>
        </div>

        {/*  오른쪽 액션 */}
        <div className="flex items-center gap-3">
          <button className="h-10 px-3 border border-neutral-200  text-sm text-neutral-700 hover:bg-neutral-50">
            알림
          </button>

          <div className="h-10 px-3 border border-neutral-200 flex items-center gap-2">
            <div className="w-7 h-7 bg-neutral-200" />
            <div className="text-sm text-neutral-700">작업자</div>
          </div>
        </div>
      </div>
    </header>
  );
}
