import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border-line-brand bg-white text-brand-deep hover:bg-brand-soft",
  ghost: "bg-transparent px-2.5 text-brand-deep hover:bg-brand-soft",
  light: "bg-white text-ink hover:bg-on-dark",
  disabled: "cursor-not-allowed border-disabled bg-disabled text-subtle",
};

const sizes = {
  md: "min-h-11",
  lg: "min-h-12",
  xl: "min-h-13 px-6",
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

/** Class names for a rentOS button, so links can share the button look. */
export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[15px] border-[1.5px] border-transparent px-5 text-center text-[15px] font-semibold leading-snug transition-colors cursor-pointer disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}

/** Inline text button styled as a link, e.g. "Quên mật khẩu?". */
export function TextButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-brand hover:text-brand-deep",
        className,
      )}
      {...props}
    />
  );
}
