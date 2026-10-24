import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { SectionHeading } from "./section-heading";

export function OwnerCta() {
  return (
    <section className="flex flex-wrap bg-brand text-white">
      <div className="flex flex-[1_1_520px] flex-col justify-center gap-4 px-4 py-20 sm:pl-[max(40px,calc((100%-1200px)/2))] sm:pr-10">
        <SectionHeading
          inverted
          eyebrow="Dành cho chủ nhà"
          title="Có phòng hoặc căn hộ cho thuê dài hạn?"
          titleClassName="max-w-[520px]"
        />
        <p className="max-w-[480px] text-[#e4edf7]">
          Đăng bất động sản, tạo hàng loạt căn, nhận yêu cầu và gửi đề xuất hợp
          đồng trong cùng một tài khoản.
        </p>
        <div>
          <Link href="/auth/sign-up" className={buttonClass({ variant: "light" })}>
            Đăng tài sản cho thuê
            <ArrowUpRightIcon />
          </Link>
        </div>
      </div>
      <div className="relative min-h-[380px] flex-[1_1_420px] lg:max-h-[460px]">
        <Image
          src="/images/home/owner.jpg"
          alt="Cửa ra vào một căn nhà buổi tối"
          fill
          sizes="(min-width: 960px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
