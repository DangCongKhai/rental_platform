import { STEPS } from "./content";
import { SectionHeading } from "./section-heading";

export function Steps() {
  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-20 sm:px-10">
      <SectionHeading
        eyebrow="Từ tìm kiếm đến an cư"
        title="Bắt đầu hành trình mới chỉ với 3 bước."
      />
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-8">
        {STEPS.map((step, i) => (
          <li key={step.title} className="border-t-2 border-brand pt-4.5">
            <div className="text-[32px] font-bold text-brand">
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="mt-1.5 text-lg font-semibold leading-[26px]">
              {step.title}
            </h3>
            <p className="mt-1.5 text-sm text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
