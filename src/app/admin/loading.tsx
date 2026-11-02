export default function AdminLoading() {
  return (
    <div role="status" className="mx-auto max-w-7xl animate-pulse space-y-5">
      <span className="sr-only">Đang tải trang quản trị…</span>
      <div className="h-9 w-72 rounded bg-[#dce3eb]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-xl bg-white" />
        <div className="h-28 rounded-xl bg-white" />
        <div className="h-28 rounded-xl bg-white" />
      </div>
    </div>
  );
}
