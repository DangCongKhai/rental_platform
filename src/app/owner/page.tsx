import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function OwnerOverviewPage() {
  return (
    <section className="max-w-2xl">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">
        Tổng quan
      </h1>
      <p className="mt-2 text-muted">
        Theo dõi bất động sản, tin đăng và yêu cầu thuê từ cổng chủ nhà.
      </p>
      <Link href="/owner/properties" className={`${buttonClass()} mt-6`}>
        Xem bất động sản
      </Link>
    </section>
  );
}
