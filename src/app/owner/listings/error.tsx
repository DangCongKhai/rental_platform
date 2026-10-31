"use client";

export default function ListingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-8 text-center">
      <h1 className="text-xl font-semibold text-ink">Không tải được tin đăng</h1>
      <p className="mt-2 text-subtle">Đã xảy ra lỗi khi tải dữ liệu. Hãy thử lại.</p>
      <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-hover">Thử lại</button>
    </section>
  );
}
