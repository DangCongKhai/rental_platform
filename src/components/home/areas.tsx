import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { AREAS } from "./content";
import { SectionHeading } from "./section-heading";

export function Areas() {
  return (
    <section className="bg-ink px-4 py-20 text-white sm:px-10">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7">
        <SectionHeading
          inverted
          eyebrow="Trọn vẹn nơi bạn chọn"
          title="Đúng khu phố bạn thích. Đúng chất sống bạn yêu."
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
          {AREAS.map((area) => (
            <Link
              key={area.name}
              href="/"
              className="group relative block h-85 overflow-hidden rounded-2xl"
            >
              <Image
                src={area.image}
                alt={area.name}
                fill
                sizes="(min-width: 1200px) 400px, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-3/5 bg-[linear-gradient(0deg,rgba(9,18,22,.88),rgba(9,18,22,0))]"
              />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[26px] font-bold leading-8">{area.name}</div>
                  <div className="text-sm text-on-dark">{area.note}</div>
                </div>
                <ArrowUpRightIcon className="size-5.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
