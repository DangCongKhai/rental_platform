import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const COLUMNS = [
  { title: "Tìm nhà", links: ["Tất cả tin đăng", "Khu vực"] },
  { title: "Chủ nhà", links: ["Đăng tài sản", "Không gian quản lý"] },
  { title: "Trợ giúp", links: ["Hướng dẫn", "FAQ", "Liên hệ hỗ trợ"] },
];

/** Full footer for marketing pages. */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink px-4 pb-7 pt-14 text-white sm:px-10">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-8">
        <div className="max-w-[300px]">
          <Logo linked={false} />
          <p className="mt-3 text-sm text-on-dark-muted">
            Nơi để ở. Chọn để thuộc về. Nền tảng thuê dài hạn tại Đà Nẵng.
          </p>
        </div>
        <div className="flex flex-wrap gap-14 text-sm leading-7">
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col">
              <b>{col.title}</b>
              {col.links.map((label) => (
                <Link
                  key={label}
                  href={
                    label === "FAQ"
                      ? "/#faq"
                      : label === "Không gian quản lý"
                        ? "/owner/properties"
                        : label === "Tất cả tin đăng"
                          ? "/listings"
                          : "/"
                  }
                  className="text-on-dark-muted hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1200px] flex-wrap justify-between gap-3 border-t border-[#22313a] pt-4.5 text-[13px] text-[#aeb8c6]">
        <span>© 2026 rentOS. Nơi để ở. Chọn để thuộc về.</span>
        <span>Trợ giúp · Riêng tư · Điều khoản</span>
      </div>
    </footer>
  );
}

/** Slim footer for app pages such as auth. */
export function SlimFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-ink px-4 py-5 text-[13px] text-on-dark-muted sm:px-10">
      <span>© 2026 rentOS. Nơi để ở. Chọn để thuộc về.</span>
      <span>Cần hỗ trợ? Liên hệ rentOS</span>
    </footer>
  );
}
