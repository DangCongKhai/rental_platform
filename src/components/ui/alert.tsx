import { cn } from "@/lib/utils";
import { AlertIcon, ClockIcon, InfoIcon, MailIcon } from "./icons";

const tones = {
  info: { box: "border-[#bfd3ea] bg-[#eef3f9] text-[#1f3a5c]", Icon: InfoIcon },
  warning: { box: "border-[#f1d9a0] bg-[#fff1cc] text-[#5c3600]", Icon: MailIcon },
  error: { box: "border-[#f1b8b2] bg-[#fde4e1] text-[#7a1a14]", Icon: AlertIcon },
  neutral: { box: "border-[#c9d0da] bg-[#f1f3f6] text-[#2f3b52]", Icon: ClockIcon },
};

type AlertProps = {
  tone: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
};

export function Alert({ tone, children, className }: AlertProps) {
  const { box, Icon } = tones[tone];
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-[15px] border px-4.5 py-3.5 text-sm",
        box,
        className,
      )}
    >
      <Icon className="mt-px size-4.5" />
      <div>{children}</div>
    </div>
  );
}
