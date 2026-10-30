import { buttonClass } from "@/components/ui/button";
import { PinIcon, SearchIcon } from "@/components/ui/icons";

// Visual only for now: search is not implemented yet, so the form never submits.
export function SearchCard() {
  return (
    <form
      role="search"
      action="/"
      className="flex flex-[0_1_400px] flex-col gap-4 rounded-[20px] bg-white/96 p-7 text-ink shadow-[0_24px_60px_rgba(0,0,0,.35)]"
    >
      <div>
        <div className="text-[22px] font-bold leading-[30px] tracking-[-.01em]">
          Tìm nơi gọi là nhà
        </div>
        <div className="text-sm text-subtle">Khám phá nơi ở phù hợp với bạn.</div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="q" className="text-sm font-semibold text-ink-3">
          Khu vực hoặc từ khóa
        </label>
        <div className="flex min-h-13 items-center gap-2.5 rounded-xl border-[1.5px] border-line-strong bg-white px-3.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus">
          <PinIcon className="size-4.5 text-brand" />
          <input
            id="q"
            type="text"
            placeholder="Sơn Trà, Mỹ An, studio gần biển"
            className="min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:outline-none"
          />
        </div>
      </div>
      <button
        type="button"
        className={buttonClass({ size: "xl", className: "rounded-full" })}
      >
        <SearchIcon className="size-4.5" />
        Tìm kiếm
      </button>
      <div className="text-[13px] text-subtle">
        Chọn ngày thuê và bộ lọc chi tiết ở trang kết quả.
      </div>
    </form>
  );
}
