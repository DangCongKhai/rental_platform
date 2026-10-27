export default function LoadingProperties() {
  return (
    <section aria-label="Đang tải bất động sản" className="animate-pulse space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="h-9 w-48 rounded-lg bg-white" />
        <div className="h-11 w-44 rounded-[15px] bg-white" />
      </div>
      <div className="h-64 rounded-[15px] border border-line bg-white" />
    </section>
  );
}
