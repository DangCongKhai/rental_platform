"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";

export function NavbarVisibility({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  return segment === "admin" ? null : children;
}
