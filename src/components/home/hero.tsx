import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buttonClass } from "@/components/ui/button";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { SearchCard } from "./search-card";
import { connection } from "next/server";

export function Hero() {
  return (
    <section className="relative min-h-[720px] overflow-hidden bg-ink text-white">
      <Image
        src="/images/home/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-55"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,18,22,.85)_0%,rgba(9,18,22,.35)_60%,rgba(9,18,22,.2)_100%)]"
      />
      <div className="relative mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-10 px-4 pb-30 pt-48 sm:px-10">
        <div className="flex max-w-[620px] flex-[1_1_480px] flex-col gap-5">
          <Suspense>
            <Greeting />
          </Suspense>
          <div className="text-xs font-semibold uppercase leading-4 tracking-[.08em] text-cherub">
            Thuê dài hạn tại Đà Nẵng · tối thiểu 3 tháng
          </div>
          <h1 className="text-[40px] font-extrabold leading-[52px] tracking-[-.03em] sm:text-5xl sm:leading-[68px]">
            Nơi để ở.
            <br />
            Chọn để thuộc về.
          </h1>
          <p className="max-w-[520px] text-lg leading-7 text-on-dark">
            Liên hệ thẳng với chủ nhà, xem rõ điều khoản và xác nhận hợp đồng
            ngay trong rentOS. Xem nhà và thanh toán diễn ra ngoài ứng dụng.
          </p>
          <div>
            <Link href="/" className={buttonClass({ variant: "light", size: "xl" })}>
              Tìm nhà ngay
              <ArrowUpRightIcon />
            </Link>
          </div>
        </div>
        <SearchCard />
      </div>
    </section>
  );
}

/** Signed-in only: a welcome pill above the headline. */
async function Greeting() {
  await connection();
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="inline-flex min-h-11 items-center gap-2.5 self-start rounded-full border border-white/30 bg-white/14 px-4 text-sm font-semibold">
      <span className="size-2 rounded-full bg-cherub" />
      Chào {user.name}, chào mừng bạn trở lại rentOS
    </div>
  );
}
