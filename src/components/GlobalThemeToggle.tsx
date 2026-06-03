"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function GlobalThemeToggle() {
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard")) return null;

  return (
    <div className="global-theme-toggle">
      <ThemeToggle compact />
    </div>
  );
}
