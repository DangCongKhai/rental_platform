import { cn } from "@/lib/utils";

// Stroke icons drawn on a 16×16 grid, taken from the rentOS prototype.
type IconProps = React.ComponentProps<"svg">;

function Icon({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-3.5 flex-none", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

const icon = (d: string) =>
  function PathIcon(props: IconProps) {
    return (
      <Icon {...props}>
        <path d={d} />
      </Icon>
    );
  };

export const ArrowRightIcon = icon("M3 8h10M9 4l4 4-4 4");
export const ArrowUpRightIcon = icon("M5 11L11 5M6 5h5v5");
export const CheckIcon = icon("M3 8.5l3.2 3.2L13 4.5");
export const ChevronDownIcon = icon("M4 6l4 4 4-4");
export const MailIcon = icon("M2 4h12v8.5H2zM2 4.5l6 4.5 6-4.5");
export const AlertIcon = icon("M8 2L14.5 13.5h-13zM8 6.5v3.2M8 11.6v.1");
export const InfoIcon = icon(
  "M8 7.5v4M8 5v.1M8 1.8a6.2 6.2 0 100 12.4A6.2 6.2 0 008 1.8z",
);
export const ClockIcon = icon(
  "M8 4.5V8l2.5 1.5M8 1.8a6.2 6.2 0 100 12.4A6.2 6.2 0 008 1.8z",
);
export const GlobeIcon = icon(
  "M8 1.8a6.2 6.2 0 100 12.4A6.2 6.2 0 008 1.8zM1.8 8h12.4M8 1.8c1.8 1.8 2.6 3.9 2.6 6.2S9.8 12.4 8 14.2C6.2 12.4 5.4 10.3 5.4 8S6.2 3.6 8 1.8",
);
export const PinIcon = icon(
  "M8 14s5-4.2 5-8A5 5 0 003 6c0 3.8 5 8 5 8zM8 7.7a1.7 1.7 0 100-3.4 1.7 1.7 0 000 3.4z",
);
export const SearchIcon = icon("M7 12a5 5 0 100-10 5 5 0 000 10zM10.6 10.6L14 14");
export const LogoutIcon = icon("M6 2.5H3v11h3M10 5l3 3-3 3M13 8H6");
export const EyeIcon = icon(
  "M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4zM8 6.3a1.7 1.7 0 100 3.4 1.7 1.7 0 000-3.4z",
);
export const PhoneIcon = icon(
  "M4.5 2.5l2 3-1.5 1.5a8 8 0 004 4L10.5 9.5l3 2-1 2.5c-5 0-10-5-10-10z",
);
export const ContractIcon = icon(
  "M4 1.5h5.5L13 5v9.5H4zM9.5 1.5V5H13M6 9.5l1.4 1.4L10 8.3",
);
export const CalendarIcon = icon("M2.5 4h11v9.5h-11zM2.5 7h11M5.5 2v3M10.5 2v3");

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.4 6.3a4.6 4.6 0 019.2 0c0 3 .7 4.1 1.2 4.6H2.2c.5-.5 1.2-1.6 1.2-4.6z" />
      <path d="M6.3 12.2a1.7 1.7 0 003.4 0" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.4 7.2 8 2.6l5.6 4.6V13.4H10V9.2H6v4.2H2.4z" />
    </Icon>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.6 13.4V3.2h6.2v10.2M8.8 6.4H13.4v7M4.4 5.6h2.2M4.4 8h2.2M4.4 10.4h2.2" />
    </Icon>
  );
}

export function MenuListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </Icon>
  );
}

export function RequestIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 1.6h5.2L13 5.2v9.2H4zM9.2 1.6V5.2H13M6 8.2h4M6 10.6h4" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 8.3a2.3 2.3 0 100-4.6 2.3 2.3 0 000 4.6zM3.2 13.3c.6-2.1 2.4-3.2 4.8-3.2s4.2 1.1 4.8 3.2" />
    </Icon>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.8a6.2 6.2 0 100 12.4A6.2 6.2 0 008 1.8zM6.5 6.3a1.6 1.6 0 112.9.9c-.4.6-1.4.9-1.4 1.8M8 11.7v.1" />
    </Icon>
  );
}
