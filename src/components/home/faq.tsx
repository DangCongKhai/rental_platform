import { FAQ } from "./content";
import { SectionHeading } from "./section-heading";

export function Faq() {
  return (
    <section
      id="faq"
      className="mx-auto flex w-full max-w-[1200px] scroll-mt-4 flex-wrap gap-10 px-4 py-20 sm:px-10"
    >
      <div className="flex-[1_1_320px]">
        <SectionHeading eyebrow="Một chút rõ ràng" title="Trước khi bạn chuyển đến.">
          <p className="mt-2 text-sm text-muted">
            Những câu hỏi về cách rentOS hoạt động.
          </p>
        </SectionHeading>
      </div>
      <div className="flex flex-[2_1_560px] flex-col">
        {FAQ.map((item, i) => (
          <details
            key={item.q}
            open={i === 0}
            className="group border-b border-line"
          >
            <summary className="flex min-h-15 cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
              {item.q}
              <span aria-hidden="true" className="text-[22px] text-brand">
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">−</span>
              </span>
            </summary>
            <p className="mb-4.5 text-sm text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
