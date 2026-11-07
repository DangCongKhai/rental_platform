import { cn } from "@/lib/utils";
import { CheckIcon } from "./icons";

type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  children: React.ReactNode;
};

export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 text-sm",
        className,
      )}
    >
      <span className="relative inline-flex size-5.5 flex-none">
        <input
          type="checkbox"
          className="peer size-full cursor-pointer appearance-none rounded-md border-2 border-[#7a8799] bg-white checked:border-brand checked:bg-brand"
          {...props}
        />
        <CheckIcon className="pointer-events-none absolute inset-0 m-auto hidden size-3.5 text-white peer-checked:block" />
      </span>
      <span>{children}</span>
    </label>
  );
}
