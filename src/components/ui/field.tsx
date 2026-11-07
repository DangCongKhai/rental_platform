import { cn } from "@/lib/utils";

type FieldProps = React.ComponentProps<"input"> & {
  id: string;
  label: string;
  invalid?: boolean;
  children?: React.ReactNode;
};

/** Label + input pair; `children` renders below the input (hints, meters). */
export function Field({
  id,
  label,
  invalid,
  className,
  children,
  ...props
}: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-3">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-h-12 w-full rounded-xl border-[1.5px] border-line-strong bg-white px-3.5 py-2.5 text-base text-ink-2 placeholder:text-subtle",
          invalid && "border-danger bg-[#fff8f7]",
          className,
        )}
        {...props}
      />
      {children}
    </div>
  );
}
