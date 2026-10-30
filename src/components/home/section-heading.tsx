import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow: string;
  title: React.ReactNode;
  /** Use on dark or brand-colored sections. */
  inverted?: boolean;
  titleClassName?: string;
  children?: React.ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  inverted = false,
  titleClassName,
  children,
}: SectionHeadingProps) {
  return (
    <div>
      <div
        className={cn(
          "text-xs font-semibold uppercase leading-4 tracking-[.08em]",
          inverted ? "text-cherub" : "text-brand",
        )}
      >
        {eyebrow}
      </div>
      <h2
        className={cn(
          "mt-2 text-[28px] font-bold leading-9 tracking-[-.02em] sm:text-4xl sm:leading-11",
          inverted ? "text-white" : "text-ink",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
