import {
  CalendarIcon,
  ContractIcon,
  EyeIcon,
  PhoneIcon,
} from "@/components/ui/icons";
import { FEATURES } from "./content";

const ICONS = {
  eye: EyeIcon,
  phone: PhoneIcon,
  contract: ContractIcon,
  calendar: CalendarIcon,
};

/** "Why rentOS" card that overlaps the bottom of the hero. */
export function Features() {
  return (
    <section className="relative mx-auto -mt-18 flex w-[calc(100%-32px)] max-w-[1180px] flex-wrap gap-x-10 gap-y-7 rounded-3xl bg-white px-6 py-9 shadow-float sm:w-[calc(100%-48px)] sm:px-10">
      <div className="flex-[1_1_260px]">
        <div className="text-xs font-semibold uppercase leading-4 tracking-[.08em] text-brand">
          Vì sao chọn rentOS
        </div>
        <h2 className="mt-2 text-[28px] font-bold leading-9 tracking-[-.02em]">
          Tìm nhà dễ dàng.
          <br />
          Sống an tâm.
        </h2>
      </div>
      <div className="grid flex-[3_1_640px] grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-6">
        {FEATURES.map(({ icon, title, text }) => {
          const Icon = ICONS[icon];
          return (
            <div key={title}>
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="size-4.5" />
              </span>
              <div className="mt-2.5 font-semibold">{title}</div>
              <div className="text-sm text-subtle">{text}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
