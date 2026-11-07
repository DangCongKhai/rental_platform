"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-8 text-center">
      <h1 className="text-xl font-bold">Không tải được trang quản trị</h1>
      <p className="mt-2 text-sm text-[#627184]">
        Đã có lỗi khi tải dữ liệu. Vui lòng thử lại.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg bg-[#376da5] px-4 py-2.5 text-sm font-semibold text-white"
      >
        Thử lại
      </button>
    </div>
  );
}
